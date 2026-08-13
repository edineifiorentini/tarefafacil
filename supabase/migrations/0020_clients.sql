-- =====================================================================
-- TarefaFácil — 0020_clients  (evolução SaaS: módulo Clientes/CRM)
-- Cliente é uma entidade DENTRO do workspace (o elo entre demanda, contrato
-- e financeiro). Não confundir com os "tenants" do painel da plataforma.
-- =====================================================================

create table public.client (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspace(id) on delete cascade,
  type          text not null default 'pj' check (type in ('pf', 'pj')),
  name          text not null,              -- razão social / nome
  fantasy_name  text,                       -- nome fantasia
  document      text,                       -- CPF/CNPJ (mascarado na UI)
  email         text,
  phone         text,
  status        text not null default 'ativo'
                  check (status in ('prospecto', 'ativo', 'pausado', 'encerrado')),
  entry_date    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger client_set_updated_at
  before update on public.client
  for each row execute function public.set_updated_at();

create index client_workspace_idx on public.client (workspace_id);
create index client_status_idx on public.client (workspace_id, status);

alter table public.client enable row level security;

create policy client_select on public.client
  for select using (public.is_member(workspace_id));
create policy client_write on public.client
  for all using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));

-- Vínculo demanda -> cliente (opcional).
alter table public.task
  add column if not exists client_id uuid references public.client(id) on delete set null;

create index if not exists task_client_idx on public.task (client_id)
  where client_id is not null;
