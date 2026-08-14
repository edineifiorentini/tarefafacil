-- =====================================================================
-- TarefaFácil — 0025_task_activity
-- Aprofunda Demandas (rodada 2): histórico de auditoria — quem mudou
-- status/prazo/responsável/prioridade e quando. Escrita só via trigger
-- (SECURITY DEFINER); sem policy de insert para o usuário autenticado.
-- =====================================================================

create table public.task_activity (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  task_id      uuid not null references public.task(id) on delete cascade,
  changed_by   uuid references public.app_user(id) on delete set null,
  field        text not null,
  old_value    text,
  new_value    text,
  created_at   timestamptz not null default now()
);

create index task_activity_task_idx on public.task_activity (task_id, created_at desc);

alter table public.task_activity enable row level security;

create policy task_activity_select on public.task_activity
  for select using (public.is_member(workspace_id));

-- Registra a mudança campo a campo (só os campos que importam para o
-- histórico — título/descrição não geram ruído). changed_by vem do JWT da
-- sessão que fez o UPDATE; nulo quando a alteração vem de um processo do
-- servidor (ex.: sync do Google via chave secreta).
create or replace function public.task_log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if new.completed_at is distinct from old.completed_at then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'completed_at', old.completed_at::text, new.completed_at::text);
  end if;
  if new.cancelled_at is distinct from old.cancelled_at then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'cancelled_at', old.cancelled_at::text, new.cancelled_at::text);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'due_date', old.due_date::text, new.due_date::text);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'priority', old.priority, new.priority);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'assignee_id', old.assignee_id::text, new.assignee_id::text);
  end if;
  if new.column_id is distinct from old.column_id then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'column_id', old.column_id::text, new.column_id::text);
  end if;
  return new;
end;
$$;

create trigger task_log_activity_trigger
  after update on public.task
  for each row execute function public.task_log_activity();
