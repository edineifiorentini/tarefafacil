-- =====================================================================
-- TarefaFácil — 0023_task_participants
-- Aprofunda Demandas (rodada 2): múltiplos participantes além do
-- responsável principal (task.assignee_id continua existindo).
-- =====================================================================

create table public.task_participant (
  task_id      uuid not null references public.task(id) on delete cascade,
  user_id      uuid not null references public.app_user(id) on delete cascade,
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_participant_task_idx on public.task_participant (task_id);
create index task_participant_ws_idx on public.task_participant (workspace_id);

alter table public.task_participant enable row level security;

create policy task_participant_select on public.task_participant
  for select using (public.is_member(workspace_id));
create policy task_participant_write on public.task_participant
  for all using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));
