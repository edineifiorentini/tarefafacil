-- =====================================================================
-- TarefaFácil — 0026_task_comments
-- Aprofunda Demandas (rodada 2): comentários com @menções. Distinto de
-- `insight` (que é o log de decisões/ADR-008, editável só por 5min).
-- =====================================================================

create table public.task_comment (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspace(id) on delete cascade,
  task_id            uuid not null references public.task(id) on delete cascade,
  author_id          uuid not null references public.app_user(id) on delete cascade,
  body               text not null check (char_length(body) between 1 and 4000),
  mentioned_user_ids uuid[] not null default '{}',
  created_at         timestamptz not null default now()
);

create index task_comment_task_idx on public.task_comment (task_id, created_at asc);

alter table public.task_comment enable row level security;

create policy task_comment_select on public.task_comment
  for select using (public.is_member(workspace_id));
create policy task_comment_write on public.task_comment
  for all using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));
