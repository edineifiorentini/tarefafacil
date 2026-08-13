-- =====================================================================
-- TarefaFácil — 0018_suspend
-- Bloqueio manual do cliente (independente do tempo de acesso). O acesso
-- fica bloqueado se suspenso OU vencido. has_role passa a negar escrita
-- também quando suspenso (paywall no banco).
-- =====================================================================

alter table public.workspace
  add column if not exists suspended boolean not null default false;

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
      and w.suspended = false
      and (w.access_expires_at is null or w.access_expires_at > now())
  );
$$;
