-- =====================================================================
-- TarefaFácil — 0037_notifications
-- Fase 8: central de notificações.
--
-- Aqui vivem só as notificações de EVENTO (alguém te mencionou, alguém te
-- atribuiu uma demanda, comentaram na sua demanda). Os alertas de TEMPO
-- (prazo próximo, atrasada, contrato vencendo, parcela a vencer) não são
-- armazenados: são estado atual, derivados na leitura em
-- `lib/notifications/derive.ts`. Guardá-los criaria uma linha por dia por
-- demanda e exigiria um job só para expirá-las.
--
-- Quem escreve é o TRIGGER, não o cliente. As mutações do app vão direto do
-- navegador ao PostgREST; se a notificação dependesse de uma chamada do
-- cliente, bastaria não fazê-la. Por isso não existe policy de INSERT: as
-- funções são security definer e a RLS do destinatário não as alcança.
-- =====================================================================

create table public.notification (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  -- Destinatário. Uma linha por pessoa notificada.
  user_id      uuid not null references public.app_user(id) on delete cascade,
  kind         text not null check (kind in ('mencao', 'atribuicao', 'comentario')),
  entity_type  text not null check (entity_type in ('task')),
  entity_id    uuid not null,
  -- Quem causou. `set null` para a notificação sobreviver à saída da pessoa.
  actor_id     uuid references public.app_user(id) on delete set null,
  title        text not null,
  body         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- O sino lê sempre "as minhas, não lidas primeiro, mais recentes antes".
create index notification_inbox_idx
  on public.notification (user_id, created_at desc);

alter table public.notification enable row level security;

-- Só o destinatário vê e marca como lida. Sem policy de insert de propósito.
create policy notification_own_select on public.notification
  for select using (user_id = auth.uid());
create policy notification_own_update on public.notification
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy notification_own_delete on public.notification
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Comentário: notifica os mencionados e o responsável pela demanda.
-- ---------------------------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  task_title text;
  task_assignee uuid;
  recipient uuid;
  trecho text;
begin
  select coalesce(display_name, email) into actor_name
  from public.app_user where id = new.author_id;

  select title, assignee_id into task_title, task_assignee
  from public.task where id = new.task_id;

  -- Primeiras palavras do comentário: dá contexto sem despejar 4000 chars.
  trecho := left(new.body, 140);

  -- Mencionados. distinct porque a mesma pessoa pode ser citada duas vezes
  -- no mesmo comentário.
  for recipient in
    select distinct m from unnest(new.mentioned_user_ids) as m
  loop
    -- Ninguém é notificado de si mesmo.
    if recipient is not null and recipient <> new.author_id then
      insert into public.notification
        (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
      values
        (new.workspace_id, recipient, 'mencao', 'task', new.task_id,
         new.author_id, actor_name || ' mencionou você em ' || task_title, trecho);
    end if;
  end loop;

  -- Responsável, quando não é o autor nem já foi avisado pela menção.
  if task_assignee is not null
     and task_assignee <> new.author_id
     and not (task_assignee = any (new.mentioned_user_ids))
  then
    insert into public.notification
      (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
    values
      (new.workspace_id, task_assignee, 'comentario', 'task', new.task_id,
       new.author_id, actor_name || ' comentou em ' || task_title, trecho);
  end if;

  return new;
end;
$$;

create trigger task_comment_notify
  after insert on public.task_comment
  for each row execute function public.notify_on_comment();

-- ---------------------------------------------------------------------
-- Atribuição: avisa quem passou a ser responsável.
-- ---------------------------------------------------------------------
create or replace function public.notify_on_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  -- Só quando muda de fato, tem destinatário, e o destinatário não é quem
  -- fez a mudança (atribuir a si mesmo não gera aviso).
  if new.assignee_id is null
     or new.assignee_id is not distinct from old.assignee_id
     or new.assignee_id = auth.uid()
  then
    return new;
  end if;

  select coalesce(display_name, email) into actor_name
  from public.app_user where id = auth.uid();

  insert into public.notification
    (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
  values
    (new.workspace_id, new.assignee_id, 'atribuicao', 'task', new.id,
     auth.uid(),
     coalesce(actor_name, 'Alguém') || ' atribuiu uma demanda a você',
     new.title);

  return new;
end;
$$;

create trigger task_assignee_notify
  after update of assignee_id on public.task
  for each row execute function public.notify_on_assignee();
