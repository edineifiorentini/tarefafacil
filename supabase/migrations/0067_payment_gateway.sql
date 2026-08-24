-- =====================================================================
-- TarefaFácil — 0067_payment_gateway
-- Conta de recebimento de CADA EMPRESA (roadmap §21).
--
-- Não confundir com a cobrança da plataforma (§10, `lib/billing`): lá é uma
-- credencial só, do dono, no ambiente, para cobrar os assinantes. Aqui é uma
-- credencial POR WORKSPACE, cadastrada pela própria empresa, para ela cobrar
-- os clientes dela. Mesmo assunto, donos diferentes.
--
-- Três decisões:
--
-- 1. `credentials` chega CIFRADO da aplicação (AES-256-GCM, chave em
--    CREDENTIAL_ENCRYPTION_KEY). O Supabase já cifra em disco, mas isso só
--    protege o disco: quem tiver a chave secreta do projeto, ou um dump,
--    leria o token e passaria a emitir cobrança em nome do cliente. Com a
--    cifra da aplicação, o banco guarda algo que não serve para nada sem uma
--    chave que nunca esteve nele.
--
-- 2. RLS ligada e nenhuma policy — mesma decisão da `google_connection`
--    (0007). O cliente jamais lê esta tabela; quem lê é o servidor com a
--    chave secreta, e o que a tela recebe é só situação (apelido da conta,
--    ambiente, data da última conferência). O token não volta NUNCA, nem
--    mascarado: mascarar é o começo de vazar.
--
-- 3. Uma linha por (workspace, provedor). Uma empresa pode ter Mercado Pago
--    e Asaas ao mesmo tempo — são contas diferentes, não substitutas. Qual
--    deles emite a cobrança é decisão de quando existir cobrança; hoje não
--    existe, e inventar um "padrão" agora seria adivinhar.
-- =====================================================================

create table public.payment_gateway (
  workspace_id  uuid not null references public.workspace(id) on delete cascade,
  provider      text not null check (provider in ('mercado_pago', 'asaas')),

  -- Produção cobra de verdade. É por isso que o ambiente é explícito e não
  -- deduzido do token: o erro de testar com credencial de produção emite
  -- cobrança para gente real, e a tela precisa poder avisar antes.
  environment   text not null check (environment in ('sandbox', 'producao')),

  /** Cifrado pela aplicação. Ilegível para quem só tem acesso ao banco. */
  credentials   text not null,

  /** Nome ou e-mail da conta no provedor, para a pessoa reconhecer qual é. */
  account_label text,

  /** Desligar suspende a emissão sem perder a configuração. */
  active        boolean not null default true,

  /** Quando o provedor confirmou a credencial pela última vez. */
  last_verified_at timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  primary key (workspace_id, provider)
);

create trigger payment_gateway_set_updated_at
  before update on public.payment_gateway
  for each row execute function public.set_updated_at();

alter table public.payment_gateway enable row level security;

-- ---------------------------------------------------------------------
-- Auditoria (§15: dinheiro entra na trilha)
--
-- Aqui a trilha NÃO sai de gatilho, e é uma exceção deliberada à decisão da
-- 0044. O padrão dela é "quem escreve é o gatilho", porque a alternativa era
-- confiar no cliente. Nesta tabela o cliente não escreve de jeito nenhum —
-- RLS sem policy —, então o único escritor possível já é o servidor.
--
-- E o gatilho aqui seria pior que inútil: `write_audit` e `actor_name()`
-- leem `auth.uid()`, que é NULO na conexão da chave secreta. A frase do
-- resumo viraria `null || ' conectou...'` = null, e `summary` é `not null` —
-- ou seja, o gatilho derrubaria toda tentativa de salvar credencial.
--
-- A saída é uma irmã da `write_audit` que recebe o autor por parâmetro. A
-- garantia da 0044 continua de pé, porque ela NÃO é exposta ao cliente:
-- `authenticated` não pode executá-la. Se pudesse, qualquer usuário forjaria
-- linha na trilha em nome de outro, e trilha forjável não prova nada.
-- ---------------------------------------------------------------------
create or replace function public.write_audit_as(
  ws uuid,
  autor uuid,
  acao text,
  tipo text,
  id_entidade uuid,
  resumo text,
  detalhes jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $fn$
  insert into public.audit_log
    (workspace_id, actor_id, action, entity_type, entity_id, summary, details)
  -- Mesma guarda da 0053: workspace em cascade de exclusão já pode ter ido
  -- embora, e a FK derrubaria a operação inteira por causa da trilha.
  select ws, autor, acao, tipo, id_entidade, resumo, detalhes
  where exists (select 1 from public.workspace where id = ws);
$fn$;

revoke all on function public.write_audit_as(
  uuid, uuid, text, text, uuid, text, jsonb
) from public, anon, authenticated;

grant execute on function public.write_audit_as(
  uuid, uuid, text, text, uuid, text, jsonb
) to service_role;

comment on table public.payment_gateway is
  'Conta de recebimento por empresa. Auditada pela rota /api/payments via write_audit_as: a chave secreta não tem auth.uid().';
