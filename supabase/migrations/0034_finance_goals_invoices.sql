-- =====================================================================
-- TarefaFácil — 0034_finance_goals_invoices
-- Financeiro rodada 2: meta mensal (histórico por mês, spec 8.5) e
-- rastreio manual de notas fiscais (spec 8.10 — sem integração real com
-- prefeitura/SEFAZ, só registro de emissão).
-- =====================================================================

create table public.finance_goal (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  month        text not null, -- "YYYY-MM"
  target_cents integer not null check (target_cents > 0),
  created_by   uuid references public.app_user(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, month)
);

create trigger finance_goal_set_updated_at
  before update on public.finance_goal
  for each row execute function public.set_updated_at();

alter table public.finance_goal enable row level security;

create policy finance_goal_select on public.finance_goal
  for select using (public.has_role(workspace_id, array['owner', 'admin']));
create policy finance_goal_write on public.finance_goal
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

alter table public.finance_entry
  add column if not exists needs_invoice boolean not null default false,
  add column if not exists invoice_number text,
  add column if not exists invoice_issued_at date,
  add column if not exists invoice_file_url text;
