-- =====================================================================
-- TarefaFácil — 0003_rls  (docs/design.md, seção 4.4)
-- Isolamento por workspace. Ativo desde o início (ADR-001, RN-07).
--
-- is_member() é SECURITY DEFINER: consulta workspace_member ignorando RLS,
-- evitando recursão de política e mantendo o custo baixo.
-- =====================================================================

create or replace function public.is_member(ws uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_member
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- Habilita RLS em todas as tabelas
alter table public.workspace        enable row level security;
alter table public.app_user         enable row level security;
alter table public.workspace_member enable row level security;
alter table public.sector           enable row level security;
alter table public.board_column     enable row level security;
alter table public.project          enable row level security;
alter table public.task             enable row level security;
alter table public.subtask          enable row level security;
alter table public.insight          enable row level security;
alter table public.attachment       enable row level security;
alter table public.tag              enable row level security;
alter table public.task_tag         enable row level security;

-- workspace: membro enxerga/edita o próprio workspace
create policy workspace_tenant on public.workspace
  for all
  using (public.is_member(id))
  with check (public.is_member(id));

-- app_user: cada um enxerga/edita apenas o próprio perfil
create policy app_user_self on public.app_user
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- workspace_member: membro enxerga os membros do seu workspace
create policy workspace_member_tenant on public.workspace_member
  for all
  using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- Tabelas com workspace_id: política única de isolamento
create policy sector_tenant on public.sector
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy board_column_tenant on public.board_column
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy project_tenant on public.project
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy task_tenant on public.task
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy subtask_tenant on public.subtask
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy insight_tenant on public.insight
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy attachment_tenant on public.attachment
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

create policy tag_tenant on public.tag
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- task_tag não tem workspace_id (4.2): isola via a tarefa dona
create policy task_tag_tenant on public.task_tag
  for all
  using (
    exists (
      select 1 from public.task t
      where t.id = task_tag.task_id and public.is_member(t.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.task t
      where t.id = task_tag.task_id and public.is_member(t.workspace_id)
    )
  );
