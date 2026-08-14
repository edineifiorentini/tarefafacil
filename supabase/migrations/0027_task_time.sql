-- =====================================================================
-- TarefaFácil — 0027_task_time
-- Aprofunda Demandas (rodada 2): estimativa (na tarefa) + tempo
-- registrado (apontamentos, um por sessão de trabalho).
-- =====================================================================

alter table public.task
  add column if not exists estimate_minutes int
    check (estimate_minutes is null or estimate_minutes > 0);

create table public.task_time_entry (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  task_id      uuid not null references public.task(id) on delete cascade,
  user_id      uuid not null references public.app_user(id) on delete cascade,
  minutes      int not null check (minutes > 0),
  note         text,
  logged_on    date not null default current_date,
  created_at   timestamptz not null default now()
);

create index task_time_entry_task_idx on public.task_time_entry (task_id, logged_on desc);

alter table public.task_time_entry enable row level security;

create policy task_time_entry_select on public.task_time_entry
  for select using (public.is_member(workspace_id));
create policy task_time_entry_write on public.task_time_entry
  for all using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));
