-- =====================================================================
-- TarefaFácil — 0013_seats
-- Limite de assentos por workspace (tamanho da equipe, base para venda).
-- O aceite do convite passa a respeitar o limite. seat_limit é definido pelo
-- vendedor (não pelo dono do workspace) — sem UI de auto-aumento.
-- =====================================================================

alter table public.workspace
  add column if not exists seat_limit integer not null default 5;

-- accept_invite v2: valida token + capacidade antes de criar a membership.
-- Reaceitar (já é membro) não consome novo assento — só ajusta o papel.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv     public.workspace_invite;
  v_is_member boolean;
  v_count   integer;
  v_limit   integer;
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
    select count(*) into v_count
    from public.workspace_member
    where workspace_id = v_inv.workspace_id;
    select seat_limit into v_limit
    from public.workspace
    where id = v_inv.workspace_id;

    if v_count >= v_limit then
      raise exception 'equipe cheia';
    end if;
  end if;

  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_inv.workspace_id, auth.uid(), v_inv.role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;

  update public.workspace_invite set status = 'accepted' where id = v_inv.id;
  return v_inv.workspace_id;
end;
$$;
