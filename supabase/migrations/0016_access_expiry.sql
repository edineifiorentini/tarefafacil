-- =====================================================================
-- TarefaFácil — 0016_access_expiry
-- Tempo de acesso por workspace (venda por período). NULL = sem limite.
-- Quando vence, o app bloqueia o workspace (tela de renovar). O vendedor
-- define/renova pelo painel de clientes.
-- =====================================================================

alter table public.workspace
  add column if not exists access_expires_at timestamptz;
