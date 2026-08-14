-- =====================================================================
-- TarefaFácil — 0021_member_self_select
-- Bug do convite: o convidado entra como 'pending' e, como is_member só
-- conta 'active', ele não enxergava NEM a própria linha de membership —
-- então o app não conseguia distinguir "novo usuário" de "aguardando
-- aprovação" e o jogava no onboarding (criando um workspace novo).
--
-- Esta policy ADICIONAL (RLS combina SELECT com OR) deixa qualquer usuário
-- ver a PRÓPRIA linha em qualquer status, sem afrouxar o acesso aos dados
-- do workspace (que continua gated por is_member nas demais tabelas).
-- =====================================================================

create policy workspace_member_self_select on public.workspace_member
  for select using (user_id = auth.uid());
