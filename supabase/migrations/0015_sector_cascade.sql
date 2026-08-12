-- =====================================================================
-- TarefaFácil — 0015_sector_cascade
-- Permite EXCLUIR um setor (não só arquivar). task e project apontavam para
-- sector com ON DELETE RESTRICT (bloqueava). Passa para CASCADE: excluir o
-- setor apaga suas tarefas (e subtarefas/insights/anexos/tags por cascata) e
-- seus projetos, de forma atômica. board_column já era cascade.
-- =====================================================================

alter table public.task drop constraint if exists task_sector_id_fkey;
alter table public.task
  add constraint task_sector_id_fkey
  foreign key (sector_id) references public.sector(id) on delete cascade;

alter table public.project drop constraint if exists project_sector_id_fkey;
alter table public.project
  add constraint project_sector_id_fkey
  foreign key (sector_id) references public.sector(id) on delete cascade;
