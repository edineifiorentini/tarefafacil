-- =====================================================================
-- TarefaFácil — 0039_chat_direct
-- Chat rodada 2: mensagem direta, resposta a uma mensagem e o ajuste de
-- RLS que a conversa privada exige.
--
-- O ponto crítico: na rodada 1 o select de mensagem era `is_member
-- (workspace_id)`. Guardar conversa direta na mesma tabela com essa regra
-- entregaria a conversa de duas pessoas ao workspace inteiro. Toda leitura
-- passa a depender de `can_read_channel`, que é a única fonte da resposta.
-- =====================================================================

alter table public.chat_channel
  add column kind text not null default 'setor'
    check (kind in ('geral', 'setor', 'direta')),
  -- Par canônico "menor:maior" dos dois participantes. Sem isso, A→B e B→A
  -- abririam duas conversas diferentes para o mesmo assunto.
  add column dm_key text;

update public.chat_channel
  set kind = case when sector_id is null then 'geral' else 'setor' end;

create unique index chat_channel_dm_idx
  on public.chat_channel (workspace_id, dm_key) where dm_key is not null;

-- Participantes da conversa direta. Só existe linha para `kind = 'direta'`.
create table public.chat_channel_member (
  channel_id uuid not null references public.chat_channel(id) on delete cascade,
  user_id    uuid not null references public.app_user(id) on delete cascade,
  primary key (channel_id, user_id)
);
create index chat_channel_member_user_idx
  on public.chat_channel_member (user_id);

alter table public.chat_channel_member enable row level security;

-- Resposta a uma mensagem. `set null` de propósito: apagar a mensagem citada
-- não pode apagar quem respondeu — a UI mostra "mensagem removida".
alter table public.chat_message
  add column reply_to_id uuid references public.chat_message(id) on delete set null;

-- ---------------------------------------------------------------------
-- Quem pode ler um canal. Security definer para não entrar em recursão de
-- RLS ao consultar chat_channel dentro da policy de chat_channel.
-- ---------------------------------------------------------------------
create or replace function public.can_read_channel(ch uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_channel c
    where c.id = ch
      and public.is_member(c.workspace_id)
      and (
        c.kind <> 'direta'
        or exists (
          select 1 from public.chat_channel_member m
          where m.channel_id = c.id and m.user_id = auth.uid()
        )
      )
  );
$$;

drop policy chat_channel_select on public.chat_channel;
create policy chat_channel_select on public.chat_channel
  for select using (public.can_read_channel(id));

drop policy chat_message_select on public.chat_message;
create policy chat_message_select on public.chat_message
  for select using (public.can_read_channel(channel_id));

-- Escrever exige, além do papel, poder ler o canal: sem isso alguém de fora
-- da conversa poderia inserir uma linha nela sabendo o id.
drop policy chat_message_insert on public.chat_message;
create policy chat_message_insert on public.chat_message
  for insert with check (
    public.has_role(workspace_id, array['owner', 'admin', 'member'])
    and author_id = auth.uid()
    and kind = 'humano'
    and public.can_read_channel(channel_id)
  );

create policy chat_channel_member_select on public.chat_channel_member
  for select using (public.can_read_channel(channel_id));

-- Marcar como lida também passa a exigir acesso ao canal.
drop policy chat_read_state_own on public.chat_read_state;
create policy chat_read_state_own on public.chat_read_state
  for all
  using (user_id = auth.uid() and public.can_read_channel(channel_id))
  with check (user_id = auth.uid() and public.can_read_channel(channel_id));

-- ---------------------------------------------------------------------
-- Abrir (ou reaproveitar) a conversa direta com alguém.
--
-- É função e não insert do cliente porque criar o canal exige escrever em
-- chat_channel_member para DUAS pessoas — e a policy de escrita de canal é
-- só de owner/admin. Aqui a regra fica explícita e verificável.
-- ---------------------------------------------------------------------
create or replace function public.open_direct_channel(ws uuid, other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  chave text;
  canal uuid;
begin
  if me is null or other is null or me = other then
    raise exception 'destinatário inválido';
  end if;

  -- Os dois precisam ser membros ativos do mesmo workspace. Sem esta
  -- checagem, a função (security definer) viraria um jeito de conversar com
  -- qualquer id de usuário do banco.
  if not exists (
    select 1 from public.workspace_member
    where workspace_id = ws and user_id = me and status = 'active'
  ) or not exists (
    select 1 from public.workspace_member
    where workspace_id = ws and user_id = other and status = 'active'
  ) then
    raise exception 'ambos precisam ser membros ativos do workspace';
  end if;

  chave := least(me::text, other::text) || ':' || greatest(me::text, other::text);

  select id into canal from public.chat_channel
  where workspace_id = ws and dm_key = chave;

  if canal is null then
    insert into public.chat_channel (workspace_id, kind, name, dm_key)
    values (ws, 'direta', '', chave)
    returning id into canal;

    insert into public.chat_channel_member (channel_id, user_id)
    values (canal, me), (canal, other);
  end if;

  return canal;
end;
$$;

revoke all on function public.open_direct_channel(uuid, uuid) from public;
grant execute on function public.open_direct_channel(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Os triggers da 0038 inseriam canal sem `kind`; com a coluna nova o padrão
-- é 'setor', o que marcaria o canal geral errado. Recriados explícitos.
-- ---------------------------------------------------------------------
create or replace function public.create_general_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_channel (workspace_id, sector_id, kind, name)
  values (new.id, null, 'geral', 'Geral')
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.create_sector_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_channel (workspace_id, sector_id, kind, name)
  values (new.workspace_id, new.id, 'setor', new.name)
  on conflict do nothing;
  return new;
end;
$$;
