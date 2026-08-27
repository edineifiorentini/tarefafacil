-- =====================================================================
-- 0073 — Observação interna e exclusão lógica de empresa
--
-- Duas exigências da especificação (9.6, 9.7, 18) sem lugar no schema.
--
-- 1. OBSERVAÇÃO INTERNA. Nota que a plataforma escreve sobre uma empresa e
--    o cliente nunca vê: "ligou pedindo desconto", "pagamento atrasa todo
--    mês, avisado em 12/ago". Tabela própria, e não uma coluna `notes` no
--    workspace, porque nota tem autor e data — sobrescrever a anterior
--    apaga o histórico que justamente se quer guardar.
--
-- 2. EXCLUSÃO LÓGICA. Hoje o botão de excluir faz `delete` no workspace,
--    que cascateia para TUDO: demandas, anexos, conversas e a própria
--    auditoria. Irreversível, sem motivo registrado e sem período de
--    arrependimento. A restrição 33 da especificação proíbe exatamente
--    isso — exclusão definitiva sem política de retenção.
--
--    `deleted_at` resolve com o mínimo de superfície: a empresa some da
--    lista de quem entra no app, aparece na administração marcada como
--    excluída, e pode ser restaurada. A remoção física continua existindo
--    na rota, mas passa a exigir que a empresa esteja excluída há mais de
--    30 dias — é a política de retenção que faltava.
-- =====================================================================

alter table public.workspace
  add column if not exists deleted_at timestamptz;

comment on column public.workspace.deleted_at is
  'Exclusão lógica (0073). Não nulo = fora do ar para o cliente, ainda '
  'restaurável pela plataforma. A remoção física só é permitida depois de '
  '30 dias neste estado.';

-- Índice parcial: a lista de excluídas é curta perto do total.
create index if not exists workspace_deleted_idx
  on public.workspace (deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------
-- Observação interna
-- ---------------------------------------------------------------------
create table if not exists public.admin_note (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  -- Texto, e não uuid: quem escreve é admin da plataforma, identificado por
  -- e-mail numa variável de ambiente. Não existe linha em app_user para
  -- apontar, e inventar uma criaria um usuário fantasma na base do cliente.
  autor        text not null,
  corpo        text not null check (length(trim(corpo)) > 0),
  created_at   timestamptz not null default now()
);

create index if not exists admin_note_workspace_idx
  on public.admin_note (workspace_id, created_at desc);

-- RLS LIGADA E SEM NENHUMA POLÍTICA: é o padrão do projeto para tabela que
-- só o servidor toca. Sem política, `authenticated` não lê nem escreve nada
-- — nem o dono da empresa sobre a qual a nota fala. A chave secreta ignora
-- RLS e é a única que enxerga.
alter table public.admin_note enable row level security;
