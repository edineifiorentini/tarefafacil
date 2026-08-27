-- =====================================================================
-- 0075 — Chave de API por empresa
--
-- Pedido do dono: cada empresa pode gerar uma chave aleatória para integrar
-- sistemas próprios ao TarefaFácil.
--
-- POR QUE SÓ O HASH FICA GUARDADO
--
-- O projeto guarda `token` em texto claro em `share_link` e
-- `workspace_invite`, e ali é defensável: são links de uso único, de vida
-- curta, cujo vazamento expõe UMA demanda. Chave de API é o oposto — vive
-- meses e dá acesso a tudo da empresa. Um vazamento do banco não pode virar
-- acesso às contas de todo mundo.
--
-- Guarda-se o SHA-256, e o valor cheio aparece UMA vez, na criação.
--
-- POR QUE SHA-256 E NÃO BCRYPT
--
-- Bcrypt existe para senha, que é curta e escolhida por gente: o custo alto
-- compensa a entropia baixa. Aqui a chave é 256 bits de aleatoriedade — não
-- há dicionário nem força bruta viável, e nada a ganhar com hash lento. Pior:
-- ela é conferida a CADA requisição da API, e hash lento nessa posição vira
-- porta de negação de serviço.
--
-- O PREFIXO É PROPOSITAL
--
-- Guardar os primeiros caracteres em claro é o que permite a pessoa
-- reconhecer qual chave é qual na tela e nos logs do sistema dela. Oito
-- caracteres não ajudam a adivinhar os outros 35.
-- =====================================================================

create table public.api_key (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  nome         text not null check (length(trim(nome)) > 0),

  -- SHA-256 em hex do valor completo. NUNCA o valor.
  key_hash     text not null unique,
  -- Começo da chave, para reconhecer sem revelar: "tf_a1b2c3d4".
  prefixo      text not null,

  criada_por   uuid references public.app_user(id) on delete set null,
  -- Atualizado a cada uso. É o que responde "esta chave ainda serve?".
  ultimo_uso   timestamptz,
  -- Revogar não apaga: a linha continua para o histórico dizer que existiu.
  revogada_em  timestamptz,
  created_at   timestamptz not null default now()
);

-- Autenticação de requisição busca pelo hash: é o caminho quente.
create unique index api_key_hash_idx on public.api_key (key_hash);

create index api_key_workspace_idx
  on public.api_key (workspace_id, created_at desc);

-- RLS ligada e SEM POLÍTICA — o padrão do projeto para tabela que só o
-- servidor toca (payment_gateway na 0067, admin_note na 0073). Sem política,
-- `authenticated` não lê nem escreve nada: nem a própria empresa alcança a
-- coluna do hash pelo cliente. Quem lê é a rota, com a chave secreta, e ela
-- devolve só nome, prefixo e datas.
alter table public.api_key enable row level security;
