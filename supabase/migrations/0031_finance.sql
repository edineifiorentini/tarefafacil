-- =====================================================================
-- TarefaFácil — 0031_finance
-- Módulo Financeiro (rodada 1): lançamentos de entrada/saída. Gerencial,
-- não substitui contabilidade oficial (spec 8.1). Regime de caixa.
--
-- Valor em CENTAVOS (inteiro) — evita erro de ponto flutuante; os
-- critérios de aceite do spec pedem teste de arredondamento de centavos.
-- "Vencido" é DERIVADO (status='previsto' + due_date passado), não
-- guardado — mesmo padrão de "atrasada" em task (rodada 1 de Demandas).
--
-- RLS mais restrita que o resto do app: dado financeiro é sensível, só
-- dono/admin leem e escrevem (nem "member" tem acesso, diferente do
-- padrão is_member/has_role usado nas outras tabelas).
-- =====================================================================

create table public.finance_entry (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspace(id) on delete cascade,
  kind          text not null check (kind in ('entrada', 'saida')),
  description   text not null,
  amount_cents  integer not null check (amount_cents > 0),
  status        text not null default 'previsto'
                  check (status in ('previsto', 'confirmado', 'cancelado')),
  due_date      date not null,
  confirmed_at  date,
  category      text,
  client_id     uuid references public.client(id) on delete set null,
  notes         text,
  created_by    uuid references public.app_user(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger finance_entry_set_updated_at
  before update on public.finance_entry
  for each row execute function public.set_updated_at();

create index finance_entry_ws_idx on public.finance_entry (workspace_id, due_date desc);
create index finance_entry_client_idx on public.finance_entry (client_id)
  where client_id is not null;

alter table public.finance_entry enable row level security;

create policy finance_entry_select on public.finance_entry
  for select using (public.has_role(workspace_id, array['owner', 'admin']));
create policy finance_entry_write on public.finance_entry
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));
