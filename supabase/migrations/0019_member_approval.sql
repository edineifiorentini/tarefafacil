-- =====================================================================
-- TarefaFácil — 0019_member_approval
-- Aprovação de entrada pelo dono (anti-invasão). Ao aceitar um convite, a
-- pessoa entra como 'pending' e só tem acesso quando o dono aprova.
-- is_member e has_role passam a contar apenas membros 'active'.
-- Convite continua de uso único (accept_invite marca como 'accepted').
-- =====================================================================

alter table public.workspace_member
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending'));

-- Só membros ATIVOS contam como membros (leitura/escopo).
create or replace function public.is_member(ws uuid)
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
      and m.status = 'active'
  );
$$;

-- Escrita: papel válido, membro ativo, workspace não suspenso e não vencido.
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
      and m.status = 'active'
      and w.suspended = false
      and (w.access_expires_at is null or w.access_expires_at > now())
  );
$$;

-- Aceite: entra como 'pending' (aguardando aprovação). Uso único mantido.
-- Reaceitar quando já é membro não muda o status (mantém o que estiver).
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv       public.workspace_invite;
  v_is_member boolean;
  v_count     integer;
  v_limit     integer;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select * into v_inv
  from public.workspace_invite
  where token = p_token
  for update;

  if v_inv.id is null then
    raise exception 'convite inválido';
  end if;
  if v_inv.status <> 'pending' or v_inv.expires_at < now() then
    raise exception 'convite expirado ou já usado';
  end if;

  select exists (
    select 1 from public.workspace_member
    where workspace_id = v_inv.workspace_id and user_id = auth.uid()
  ) into v_is_member;

  if not v_is_member then
    -- limite considera só os já ativos (pendentes não consomem assento ainda)
    select count(*) into v_count
    from public.workspace_member
    where workspace_id = v_inv.workspace_id and status = 'active';
    select seat_limit into v_limit
    from public.workspace
    where id = v_inv.workspace_id;

    if v_count >= v_limit then
      raise exception 'equipe cheia';
    end if;
  end if;

  insert into public.workspace_member (workspace_id, user_id, role, status)
    values (v_inv.workspace_id, auth.uid(), v_inv.role, 'pending')
    on conflict (workspace_id, user_id) do update set role = excluded.role;

  update public.workspace_invite set status = 'accepted' where id = v_inv.id;
  return v_inv.workspace_id;
end;
$$;
