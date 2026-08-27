-- =====================================================================
-- 0076 — Webhooks de saída: inscrição e fila de entregas
--
-- O TarefaFácil avisando o sistema do cliente. Não confundir com a 0049 e o
-- webhook de pagamento, que são de ENTRADA.
--
-- POR QUE O SEGREDO É CIFRADO E NÃO HASHEADO
--
-- A chave de API (0075) guarda só o hash, porque só precisa CONFERIR o que
-- chega. Aqui é o contrário: para ASSINAR o que a gente envia, o servidor
-- precisa do segredo em claro na hora do envio. Hash não serve.
--
-- Então vale a cifra da aplicação (`lib/crypto/secretBox.ts`, AES-256-GCM):
-- o banco guarda algo inútil sem a `CREDENTIAL_ENCRYPTION_KEY`, que nunca
-- esteve dentro dele.
--
-- POR QUE A FILA É UMA TABELA
--
-- Função serverless não segura fila entre requisições, e webhook precisa de
-- nova tentativa: o destino cai, volta em dez minutos, e o evento não pode
-- ter evaporado. A tabela é a fila; um cron a drena. É a mesma escolha da
-- limpeza de anexos, e o projeto já sabe operar cron.
-- =====================================================================

create table public.webhook_endpoint (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  -- Só https. A checagem forte (faixa interna, redirecionamento) é da
  -- aplicação: o Postgres não resolve DNS na hora de gravar.
  url          text not null check (url ~* '^https://'),

  -- Cifrado com secretBox. NUNCA em claro.
  segredo_cifrado text not null,

  -- Quais eventos este destino quer. Vazio = nenhum, não "todos": inscrição
  -- que recebe tudo por padrão é como alguém descobre um evento novo pelo
  -- log de erro do sistema dele.
  eventos      text[] not null default '{}',

  ativo        boolean not null default true,
  criado_por   uuid references public.app_user(id) on delete set null,

  -- Desativação automática depois de falhar demais. A contagem zera a cada
  -- entrega boa.
  falhas_seguidas integer not null default 0,
  desativado_em   timestamptz,

  created_at   timestamptz not null default now()
);

create index webhook_endpoint_workspace_idx
  on public.webhook_endpoint (workspace_id, created_at desc);

-- ---------------------------------------------------------------------
-- A fila
-- ---------------------------------------------------------------------
create table public.webhook_delivery (
  id           uuid primary key default gen_random_uuid(),
  endpoint_id  uuid not null references public.webhook_endpoint(id) on delete cascade,
  -- Repetido de propósito: a listagem por empresa não deve precisar de join,
  -- e a linha sobrevive ao endpoint na leitura do histórico.
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  evento       text not null,
  corpo        jsonb not null,

  /**
   * Qual chave de API causou o fato. Null = ação de gente pela interface.
   *
   * É o que permite NÃO reenviar para quem causou (decisão do dono em
   * 27/ago/2026: o eco sai para os outros, não para a origem). Sem gravar
   * na hora, não se recupera depois.
   */
  origem_key_id uuid references public.api_key(id) on delete set null,

  tentativas   integer not null default 0,
  proxima_tentativa timestamptz not null default now(),

  status       text not null default 'pendente'
                 check (status in ('pendente', 'entregue', 'falhou', 'desistiu')),

  ultimo_status_http integer,
  -- Recorte da resposta, para o dono entender o que o sistema dele respondeu.
  ultimo_erro  text,
  entregue_em  timestamptz,
  created_at   timestamptz not null default now()
);

-- O índice do cron: ele pergunta "o que está pendente e já pode tentar?".
-- Parcial, porque entregue e desistiu não voltam para a fila.
create index webhook_delivery_fila_idx
  on public.webhook_delivery (proxima_tentativa)
  where status = 'pendente';

create index webhook_delivery_workspace_idx
  on public.webhook_delivery (workspace_id, created_at desc);

-- RLS ligada e SEM POLÍTICA nas duas: padrão do projeto para tabela que só o
-- servidor toca. O segredo cifrado e o corpo dos eventos não passam pelo
-- cliente; quem lê é a rota, com a chave secreta.
alter table public.webhook_endpoint enable row level security;
alter table public.webhook_delivery enable row level security;
