-- =====================================================================
-- TarefaFácil — 0038_chat
-- Fase 8: chat interno da equipe (rodada 1).
--
-- Um canal por setor, mais o "Geral". É como a barra lateral já organiza o
-- trabalho — inventar uma segunda taxonomia só para a conversa faria a
-- equipe ter que decidir duas vezes onde cada assunto mora. Mensagem direta
-- entre duas pessoas fica para outra rodada.
--
-- Não lidas por `last_read_at` em (canal, usuário), não por linha de leitura
-- por mensagem: com 10 pessoas e 5 mil mensagens a segunda opção são 50 mil
-- linhas para responder "tem coisa nova?".
-- =====================================================================

create table public.chat_channel (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  -- null = canal geral do workspace.
  sector_id    uuid references public.sector(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now()
);

-- Nulos são distintos entre si no Postgres, então um `unique(workspace_id,
-- sector_id)` deixaria criar dois canais gerais. Daí os dois índices parciais.
create unique index chat_channel_geral_idx
  on public.chat_channel (workspace_id) where sector_id is null;
create unique index chat_channel_setor_idx
  on public.chat_channel (workspace_id, sector_id) where sector_id is not null;

create table public.chat_message (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspace(id) on delete cascade,
  channel_id         uuid not null references public.chat_channel(id) on delete cascade,
  -- null quando `kind = 'sistema'`: o aviso não tem dono.
  author_id          uuid references public.app_user(id) on delete set null,
  kind               text not null default 'humano' check (kind in ('humano', 'sistema')),
  body               text not null check (char_length(body) between 1 and 4000),
  mentioned_user_ids uuid[] not null default '{}',
  -- Para o aviso de sistema apontar a demanda que o originou.
  entity_type        text check (entity_type in ('task')),
  entity_id          uuid,
  created_at         timestamptz not null default now()
);

create index chat_message_channel_idx
  on public.chat_message (channel_id, created_at desc);

create table public.chat_read_state (
  channel_id   uuid not null references public.chat_channel(id) on delete cascade,
  user_id      uuid not null references public.app_user(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table public.chat_channel enable row level security;
alter table public.chat_message enable row level security;
alter table public.chat_read_state enable row level security;

-- Canal é estrutura: quem é membro vê, quem administra mexe.
create policy chat_channel_select on public.chat_channel
  for select using (public.is_member(workspace_id));
create policy chat_channel_write on public.chat_channel
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

-- Leitor lê e não escreve — mesmo critério do resto do app.
create policy chat_message_select on public.chat_message
  for select using (public.is_member(workspace_id));
create policy chat_message_insert on public.chat_message
  for insert with check (
    public.has_role(workspace_id, array['owner', 'admin', 'member'])
    and author_id = auth.uid()
    and kind = 'humano'
  );
-- Sem update: mensagem enviada não se reescreve. Apagar é só a própria.
create policy chat_message_delete on public.chat_message
  for delete using (author_id = auth.uid());

create policy chat_read_state_own on public.chat_read_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- O sino já sabe mostrar menção; agora ela pode vir do chat.
-- entity_id aponta o CANAL, não a mensagem: o clique precisa abrir a
-- conversa, e abrir a conversa já mostra a mensagem.
-- ---------------------------------------------------------------------
alter table public.notification
  drop constraint notification_entity_type_check;
alter table public.notification
  add constraint notification_entity_type_check
  check (entity_type in ('task', 'chat_channel'));

create or replace function public.notify_on_chat_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  canal text;
  recipient uuid;
begin
  if new.kind <> 'humano' or array_length(new.mentioned_user_ids, 1) is null then
    return new;
  end if;

  select coalesce(display_name, email) into actor_name
  from public.app_user where id = new.author_id;

  select name into canal from public.chat_channel where id = new.channel_id;

  for recipient in select distinct m from unnest(new.mentioned_user_ids) as m
  loop
    if recipient is not null and recipient <> new.author_id then
      insert into public.notification
        (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
      values
        (new.workspace_id, recipient, 'mencao', 'chat_channel', new.channel_id,
         new.author_id,
         actor_name || ' mencionou você em ' || canal,
         left(new.body, 140));
    end if;
  end loop;

  return new;
end;
$$;

create trigger chat_message_notify
  after insert on public.chat_message
  for each row execute function public.notify_on_chat_mention();

-- ---------------------------------------------------------------------
-- Todo setor tem canal. Trigger para os novos, backfill para os que já
-- existem — senão o setor criado ontem fica mudo para sempre.
-- ---------------------------------------------------------------------
create or replace function public.create_sector_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_channel (workspace_id, sector_id, name)
  values (new.workspace_id, new.id, new.name)
  on conflict do nothing;
  return new;
end;
$$;

create trigger sector_chat_channel
  after insert on public.sector
  for each row execute function public.create_sector_channel();

-- Renomear o setor renomeia o canal: dois nomes para a mesma coisa confunde.
create or replace function public.rename_sector_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.chat_channel set name = new.name where sector_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sector_chat_channel_rename
  after update of name on public.sector
  for each row execute function public.rename_sector_channel();

-- ---------------------------------------------------------------------
-- Demanda criada vira aviso no canal do setor.
--
-- Filha de recorrência não avisa: uma demanda semanal encheria o canal com
-- o mesmo texto toda semana, e ninguém leria mais nada ali.
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
  where workspace_id = new.workspace_id and sector_id = new.sector_id;

  if canal is null then
    return new;
  end if;

  select coalesce(display_name, email) into autor
  from public.app_user where id = auth.uid();

  insert into public.chat_message
    (workspace_id, channel_id, author_id, kind, body, entity_type, entity_id)
  values
    (new.workspace_id, canal, null, 'sistema',
     coalesce(autor, 'Alguém') || ' criou a demanda "' || new.title || '"',
     'task', new.id);

  return new;
end;
$$;

create trigger task_chat_announce
  after insert on public.task
  for each row execute function public.announce_task_in_chat();

-- Workspace novo nasce com o canal geral. Sem isso, só quem existia na hora
-- do backfill teria "Geral" — e o próximo cliente abriria um chat vazio.
create or replace function public.create_general_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_channel (workspace_id, sector_id, name)
  values (new.id, null, 'Geral')
  on conflict do nothing;
  return new;
end;
$$;

create trigger workspace_chat_channel
  after insert on public.workspace
  for each row execute function public.create_general_channel();

-- ---------------------------------------------------------------------
-- Backfill: canal geral por workspace e canal por setor já existente.
-- ---------------------------------------------------------------------
insert into public.chat_channel (workspace_id, sector_id, name)
select w.id, null, 'Geral' from public.workspace w
on conflict do nothing;

insert into public.chat_channel (workspace_id, sector_id, name)
select s.workspace_id, s.id, s.name
from public.sector s
where s.archived_at is null
on conflict do nothing;
