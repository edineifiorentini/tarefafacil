-- =====================================================================
-- TarefaFácil — 0002_indexes  (docs/design.md, seção 4.3 + auxiliares)
-- =====================================================================

-- Obrigatórios (4.3)
create index task_ws_due_open_idx
  on public.task (workspace_id, due_date)
  where completed_at is null;

create index task_ws_sector_column_pos_idx
  on public.task (workspace_id, sector_id, column_id, position);

create index task_ws_project_idx
  on public.task (workspace_id, project_id);

create index task_gcal_event_idx
  on public.task (gcal_event_id)
  where gcal_event_id is not null;

create index subtask_task_pos_idx
  on public.subtask (task_id, position);

create index project_ws_dates_idx
  on public.project (workspace_id, starts_on, ends_on);

-- Auxiliares (acessos frequentes)
create index board_column_sector_pos_idx
  on public.board_column (sector_id, position);

create index sector_ws_position_idx
  on public.sector (workspace_id, position);

create index insight_task_created_idx
  on public.insight (task_id, created_at);

create index attachment_task_idx
  on public.attachment (task_id);

create index task_tag_tag_idx
  on public.task_tag (tag_id);

create index workspace_member_user_idx
  on public.workspace_member (user_id);
