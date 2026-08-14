-- =====================================================================
-- TarefaFácil — 0028_task_dependencies
-- Aprofunda Demandas (rodada 2): dependências/bloqueios entre demandas
-- ("aguarda X terminar"). Sem detecção de ciclo completa nesta rodada —
-- só impede auto-referência; ciclos indiretos ficam para depois.
-- =====================================================================

create table public.task_dependency (
  task_id         uuid not null references public.task(id) on delete cascade,
  depends_on_id   uuid not null references public.task(id) on delete cascade,
  workspace_id    uuid not null references public.workspace(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (task_id, depends_on_id),
  constraint task_dependency_no_self check (task_id <> depends_on_id)
);

create index task_dependency_task_idx on public.task_dependency (task_id);
create index task_dependency_depends_on_idx on public.task_dependency (depends_on_id);

alter table public.task_dependency enable row level security;

create policy task_dependency_select on public.task_dependency
  for select using (public.is_member(workspace_id));
create policy task_dependency_write on public.task_dependency
  for all using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));
