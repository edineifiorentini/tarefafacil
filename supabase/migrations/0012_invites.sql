-- =====================================================================
-- TarefaFácil — 0012_invites  (E18)
-- Convite por link: owner/admin gera um token com papel; o convidado logado
-- aceita via accept_invite (SECURITY DEFINER), virando membro.
-- =====================================================================

create table public.workspace_invite (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  email        text,                       -- opcional: convite pode ser aberto
  role         text not null default 'member'
                 check (role in ('admin', 'member', 'viewer')),
  token        text not null unique default encode(gen_random_bytes(18), 'hex'),
  invited_by   uuid,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'revoked')),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

create index workspace_invite_ws_idx on public.workspace_invite (workspace_id);

alter table public.workspace_invite enable row level security;

-- Só owner/admin do workspace enxergam e gerenciam os convites.
create policy workspace_invite_manage on public.workspace_invite
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

-- Aceite: valida token pendente e não expirado, cria a membership do chamador
-- com o papel do convite e marca como aceito. Retorna o workspace.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.workspace_invite;
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

  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_inv.workspace_id, auth.uid(), v_inv.role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;

  update public.workspace_invite set status = 'accepted' where id = v_inv.id;
  return v_inv.workspace_id;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
