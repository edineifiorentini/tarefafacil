-- =====================================================================
-- TarefaFácil — 0001_init
-- Schema base (docs/design.md, seção 4.2). Multi-tenant desde a 1ª linha.
-- Colunas de recorrência reservadas em task (D02), sem lógica.
--
-- Convenção de identidade: app_user.id É o auth.uid() do Supabase (mesmo
-- uuid). Não há FK rígida para auth.users para permitir seed independente;
-- o vínculo é criado no signup (E03). Ver ADR-001.
-- =====================================================================

create extension if not exists pgcrypto;

-- Função utilitária: mantém updated_at em dia.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- workspace
-- ---------------------------------------------------------------------
create table public.workspace (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_user_id uuid,
  plan          text not null default 'free' check (plan in ('free', 'pro', 'team')),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- app_user  (perfil; id = auth.uid())
-- ---------------------------------------------------------------------
create table public.app_user (
  id           uuid primary key,
  email        text not null unique,
  display_name text,
  avatar_url   text,
  locale       text not null default 'pt-BR',
  timezone     text not null default 'America/Sao_Paulo',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- workspace_member  (ativa de fato na fase 3; na fase 1 tem 1 linha)
-- ---------------------------------------------------------------------
create table public.workspace_member (
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  user_id      uuid not null references public.app_user(id) on delete cascade,
  role         text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ---------------------------------------------------------------------
-- sector
-- ---------------------------------------------------------------------
create table public.sector (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name         text not null,
  color        text not null check (color in ('violeta', 'azul', 'coral', 'rosa', 'grafite')),
  icon         text not null default 'folder',
  position     int not null default 0,
  archived_at  timestamptz
);

-- ---------------------------------------------------------------------
-- board_column  (colunas do Kanban, por setor)
-- ---------------------------------------------------------------------
create table public.board_column (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspace(id) on delete cascade,
  sector_id      uuid not null references public.sector(id) on delete cascade,
  name           text not null,
  position       int not null default 0,
  is_done_column boolean not null default false
);

-- ---------------------------------------------------------------------
-- project
-- ---------------------------------------------------------------------
create table public.project (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  sector_id    uuid not null references public.sector(id) on delete restrict,
  name         text not null,
  description  text,
  starts_on    date,
  ends_on      date,
  status       text not null default 'planejado'
                 check (status in ('planejado', 'ativo', 'pausado', 'concluido')),
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- task
-- ---------------------------------------------------------------------
create table public.task (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspace(id) on delete cascade,
  sector_id            uuid not null references public.sector(id) on delete restrict,
  project_id           uuid references public.project(id) on delete set null,
  column_id            uuid references public.board_column(id) on delete set null,
  title                text not null,
  description          text,
  due_date             date,
  due_time             time,                          -- null = tarefa de dia inteiro
  priority             text not null default 'media'
                         check (priority in ('baixa', 'media', 'alta')),
  assignee_id          uuid,                          -- fase 3
  completed_at         timestamptz,
  position             numeric not null default 0,    -- ordenação fracionária (4.5)
  gcal_sync            boolean not null default false,
  gcal_event_id        text,
  gcal_etag            text,
  gcal_synced_at       timestamptz,
  recurrence_rule      text,                          -- reservado (D02)
  recurrence_parent_id uuid references public.task(id) on delete set null, -- reservado (D02)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger task_set_updated_at
  before update on public.task
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- subtask  (checklist; sem anexo/responsável/subtarefa — RN-01)
-- ---------------------------------------------------------------------
create table public.subtask (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  task_id      uuid not null references public.task(id) on delete cascade,
  title        text not null,
  due_date     date,
  completed_at timestamptz,
  position     int not null default 0
);

-- ---------------------------------------------------------------------
-- insight  (log datado — ADR-008)
-- ---------------------------------------------------------------------
create table public.insight (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  task_id      uuid not null references public.task(id) on delete cascade,
  body         text not null,
  author_id    uuid,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- attachment  (arquivo no bucket ou link — ADR-006)
-- ---------------------------------------------------------------------
create table public.attachment (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  task_id      uuid not null references public.task(id) on delete cascade,
  kind         text not null check (kind in ('file', 'link')),
  storage_key  text,
  external_url text,
  filename     text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid,
  created_at   timestamptz not null default now(),
  constraint attachment_kind_target check (
    (kind = 'file' and storage_key is not null) or
    (kind = 'link' and external_url is not null)
  )
);

-- ---------------------------------------------------------------------
-- tag  (reutilizável no workspace; nome único case-insensitive)
-- ---------------------------------------------------------------------
create table public.tag (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name         text not null,
  color        text
);

create unique index tag_workspace_name_unique
  on public.tag (workspace_id, lower(name));

-- ---------------------------------------------------------------------
-- task_tag  (N:N)
-- ---------------------------------------------------------------------
create table public.task_tag (
  task_id uuid not null references public.task(id) on delete cascade,
  tag_id  uuid not null references public.tag(id) on delete cascade,
  primary key (task_id, tag_id)
);
