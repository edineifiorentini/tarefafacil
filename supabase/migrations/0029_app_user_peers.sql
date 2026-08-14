-- =====================================================================
-- TarefaFácil — 0029_app_user_peers
-- Bug: app_user só tinha a policy "app_user_self" (id = auth.uid()).
-- useMembers/AssigneeAvatar/ParticipantsSelector/CommentList/etc. fazem
-- join client-side (RLS) com app_user para mostrar nome de OUTROS membros
-- — a RLS bloqueava e o nome caía em branco (só o próprio usuário
-- aparecia com nome).
--
-- Nova policy SELECT: além de si mesmo, um usuário enxerga o perfil de
-- quem compartilha um workspace ATIVO com ele (colega de equipe). RLS
-- combina múltiplas policies do mesmo comando com OR — não afrouxa
-- insert/update/delete (continuam só a própria linha via app_user_self).
-- =====================================================================

create policy app_user_workspace_peers on public.app_user
  for select
  using (
    exists (
      select 1
      from public.workspace_member m1
      join public.workspace_member m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid()
        and m1.status = 'active'
        and m2.user_id = app_user.id
        and m2.status = 'active'
    )
  );
