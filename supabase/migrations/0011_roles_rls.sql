-- =====================================================================
-- TarefaFácil — 0011_roles_rls  (E18)
-- Papéis com RLS: leitura para qualquer membro; escrita só owner/admin/member.
-- Viewer é somente-leitura. workspace e workspace_member só mudam por owner/admin.
-- =====================================================================

-- has_role: o usuário atual tem um dos papéis no workspace? SECURITY DEFINER
-- (consulta workspace_member ignorando RLS, como is_member).
create or replace function public.has_role(ws uuid, roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_member m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role = any (roles)
  );
$$;

-- Papéis que podem escrever conteúdo (tudo menos viewer).
-- Recria as policies "for all" como SELECT (membro) + escrita (has_role).
do $$
declare
  t text;
  content_tables text[] := array[
    'sector', 'board_column', 'project', 'task', 'subtask', 'insight',
    'attachment', 'tag'
  ];
begin
  foreach t in array content_tables loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_member(workspace_id))',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for all
         using (public.has_role(workspace_id, array[''owner'',''admin'',''member'']))
         with check (public.has_role(workspace_id, array[''owner'',''admin'',''member'']))',
      t || '_write', t
    );
  end loop;
end $$;

-- task_tag: sem workspace_id próprio; escopo vem da task.
drop policy if exists task_tag_tenant on public.task_tag;
create policy task_tag_select on public.task_tag for select using (
  exists (
    select 1 from public.task t
    where t.id = task_tag.task_id and public.is_member(t.workspace_id)
  )
);
create policy task_tag_write on public.task_tag for all
  using (
    exists (
      select 1 from public.task t
      where t.id = task_tag.task_id
        and public.has_role(t.workspace_id, array['owner','admin','member'])
    )
  )
  with check (
    exists (
      select 1 from public.task t
      where t.id = task_tag.task_id
        and public.has_role(t.workspace_id, array['owner','admin','member'])
    )
  );

-- workspace: leitura por membro; renome só owner/admin.
drop policy if exists workspace_tenant on public.workspace;
create policy workspace_select on public.workspace
  for select using (public.is_member(id));
create policy workspace_update on public.workspace
  for update using (public.has_role(id, array['owner','admin']))
  with check (public.has_role(id, array['owner','admin']));

-- workspace_member: leitura por membro; alterações só owner/admin.
-- (a entrada do próprio convidado é feita por accept_invite, SECURITY DEFINER)
drop policy if exists workspace_member_tenant on public.workspace_member;
create policy workspace_member_select on public.workspace_member
  for select using (public.is_member(workspace_id));
create policy workspace_member_write on public.workspace_member
  for all using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));

-- Onboarding: cria um novo workspace + membership owner para quem chama.
create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  insert into public.workspace (name, owner_user_id)
    values (coalesce(nullif(trim(p_name), ''), 'Meu workspace'), auth.uid())
    returning id into v_ws;
  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_ws, auth.uid(), 'owner');
  return v_ws;
end;
$$;

grant execute on function public.has_role(uuid, text[]) to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
