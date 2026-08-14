-- =====================================================================
-- TarefaFácil — 0024_board_wip_limit
-- Aprofunda Demandas (rodada 2): limite opcional de trabalho em
-- progresso por coluna do quadro (aviso, não bloqueio).
-- =====================================================================

alter table public.board_column
  add column if not exists wip_limit int check (wip_limit is null or wip_limit > 0);
