-- =====================================================================
-- TarefaFácil — 0017_access_rls
-- Reforço do tempo de acesso na RLS. has_role passa a exigir que o workspace
-- não esteja vencido → escrita bloqueada quando expira (workspace fica
-- somente-leitura). Leitura (is_member) segue liberada, inclusive para o
-- layout mostrar a tela de "acesso expirado".
--
-- O painel de clientes usa a secret key (ignora RLS), então o vendedor
-- continua renovando/ajustando normalmente.
-- =====================================================================

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
    join public.workspace w on w.id = m.workspace_id
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role = any (roles)
      and (w.access_expires_at is null or w.access_expires_at > now())
  );
$$;
