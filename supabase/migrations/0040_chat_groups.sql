-- =====================================================================
-- TarefaFácil — 0040_chat_groups
-- Chat rodada 3: o modelo muda.
--
-- Canal por setor sai. Sobram três tipos: "Geral" (todo o workspace),
-- grupo (criado por alguém, com participantes escolhidos) e conversa direta.
-- O setor deixa de ser um lugar e vira ETIQUETA da mensagem — assim o
-- assunto se acha por filtro sem partir a conversa em doze salas que
-- ninguém acompanha.
--
-- As mensagens que já existem nos canais de setor são movidas para o Geral
-- com o setor preenchido. Apagar o canal antes levaria a mensagem junto.
-- =====================================================================

-- Etiqueta de assunto. `set null` porque apagar o setor não pode apagar a
-- conversa que falava dele.
alter table public.chat_message
  add column sector_id uuid references public.sector(id) on delete set null;

create index chat_message_sector_idx
  on public.chat_message (channel_id, sector_id)
  where sector_id is not null;

-- Quem criou o grupo. Usado para decidir quem pode renomear e remover
-- participante.
alter table public.chat_channel
  add column created_by uuid references public.app_user(id) on delete set null;

-- ---------------------------------------------------------------------
-- Migração dos dados: mensagem do canal de setor vai para o Geral do mesmo
-- workspace, carregando o setor como etiqueta.
-- ---------------------------------------------------------------------
update public.chat_message m
set channel_id = g.id,
    sector_id  = coalesce(m.sector_id, c.sector_id)
from public.chat_channel c
join public.chat_channel g
  on g.workspace_id = c.workspace_id and g.kind = 'geral'
where m.channel_id = c.id
  and c.kind = 'setor';

-- Estado de leitura dos canais de setor não tem para onde ir (o Geral tem o
-- seu). Some junto com o canal, via cascade.
delete from public.chat_channel where kind = 'setor';

-- Nada mais cria canal de setor.
drop trigger if exists sector_chat_channel on public.sector;
drop trigger if exists sector_chat_channel_rename on public.sector;
drop function if exists public.create_sector_channel();
drop function if exists public.rename_sector_channel();

alter table public.chat_channel
  drop constraint chat_channel_kind_check;
alter table public.chat_channel
  add constraint chat_channel_kind_check
  check (kind in ('geral', 'grupo', 'direta'));

-- O índice parcial de canal por setor perde o sentido.
drop index if exists chat_channel_setor_idx;

-- ---------------------------------------------------------------------
-- Grupo é privado como a conversa direta: quem não participa não lê.
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
        c.kind = 'geral'
        or exists (
          select 1 from public.chat_channel_member m
          where m.channel_id = c.id and m.user_id = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------
-- O aviso de demanda criada passa a ir para o Geral, etiquetado com o setor.
-- ---------------------------------------------------------------------
create or replace function public.announce_task_in_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  canal uuid;
  autor text;
begin
  if new.recurrence_parent_id is not null then
    return new;
  end if;

  select id into canal from public.chat_channel
  where workspace_id = new.workspace_id and kind = 'geral';

  if canal is null then
    return new;
  end if;

  select coalesce(display_name, email) into autor
  from public.app_user where id = auth.uid();

  insert into public.chat_message
    (workspace_id, channel_id, author_id, kind, body, entity_type, entity_id, sector_id)
  values
    (new.workspace_id, canal, null, 'sistema',
     coalesce(autor, 'Alguém') || ' criou a demanda "' || new.title || '"',
     'task', new.id, new.sector_id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Criar grupo.
--
-- RPC pelo mesmo motivo de open_direct_channel: criar exige gravar
-- participante para várias pessoas, e a policy de escrita de canal é só de
-- owner/admin. Aqui a regra fica explícita — e confere que todo mundo da
-- lista é membro ativo do workspace.
-- ---------------------------------------------------------------------
create or replace function public.create_group_channel(
  ws uuid,
  nome text,
  membros uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  canal uuid;
  participante uuid;
begin
  if me is null then
    raise exception 'sem usuário';
  end if;
  if coalesce(trim(nome), '') = '' then
    raise exception 'o grupo precisa de um nome';
  end if;

  -- Leitor não cria grupo, mesmo critério de escrever mensagem.
  if not public.has_role(ws, array['owner', 'admin', 'member']) then
    raise exception 'sem permissão para criar grupo';
  end if;

  insert into public.chat_channel (workspace_id, kind, name, created_by)
  values (ws, 'grupo', trim(nome), me)
  returning id into canal;

  insert into public.chat_channel_member (channel_id, user_id)
  values (canal, me);

  foreach participante in array coalesce(membros, '{}')
  loop
    if participante <> me and exists (
      select 1 from public.workspace_member
      where workspace_id = ws and user_id = participante and status = 'active'
    ) then
      insert into public.chat_channel_member (channel_id, user_id)
      values (canal, participante)
      on conflict do nothing;
    end if;
  end loop;

  return canal;
end;
$$;

/** Adicionar gente a um grupo. Só quem já está dentro pode chamar. */
create or replace function public.add_group_members(canal uuid, membros uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  ws uuid;
  participante uuid;
begin
  select workspace_id into ws from public.chat_channel
  where id = canal and kind = 'grupo';
  if ws is null then
    raise exception 'grupo não encontrado';
  end if;

  if not exists (
    select 1 from public.chat_channel_member
    where channel_id = canal and user_id = me
  ) then
    raise exception 'só quem participa do grupo pode adicionar alguém';
  end if;

  foreach participante in array coalesce(membros, '{}')
  loop
    if exists (
      select 1 from public.workspace_member
      where workspace_id = ws and user_id = participante and status = 'active'
    ) then
      insert into public.chat_channel_member (channel_id, user_id)
      values (canal, participante)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

/**
 * Sair do grupo. Só de si mesmo — tirar outra pessoa é decisão de moderação
 * que este produto ainda não tem, e fingir que tem seria pior.
 */
create or replace function public.leave_group_channel(canal uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.chat_channel_member
  where channel_id = canal
    and user_id = auth.uid()
    and exists (
      select 1 from public.chat_channel
      where id = canal and kind = 'grupo'
    );
end;
$$;

revoke all on function public.create_group_channel(uuid, text, uuid[]) from public;
revoke all on function public.add_group_members(uuid, uuid[]) from public;
revoke all on function public.leave_group_channel(uuid) from public;
grant execute on function public.create_group_channel(uuid, text, uuid[]) to authenticated;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.leave_group_channel(uuid) to authenticated;
