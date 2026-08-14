-- =====================================================================
-- TarefaFácil — 0032_contracts
-- Módulo Contratos (rodada 1): identificação, vigência e honorários.
-- Sem editor de modelos, prévia/PDF ou assinatura eletrônica real nesta
-- rodada — spec 9.3 "Assinaturas" permite MVP com registro externo
-- (data + link do documento assinado, sem simular validade jurídica).
--
-- Estados simplificados (6, não os 9 do spec completo):
-- rascunho -> enviado -> assinado -> ativo -> encerrado | cancelado.
--
-- RLS restrita como Financeiro: contrato carrega dado sensível de
-- cliente/valor — só dono/admin leem e escrevem.
-- =====================================================================

create table public.contract (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspace(id) on delete cascade,
  number             text,
  client_id          uuid not null references public.client(id) on delete cascade,
  responsible_id     uuid references public.app_user(id) on delete set null,
  title              text not null,
  description        text,
  status             text not null default 'rascunho'
                        check (status in
                          ('rascunho', 'enviado', 'assinado', 'ativo', 'encerrado', 'cancelado')),
  issued_on          date,
  starts_on          date,
  ends_on            date,
  auto_renew         boolean not null default false,
  renew_notice_days  int,
  amount_cents       integer check (amount_cents is null or amount_cents > 0),
  billing_period     text default 'mensal'
                        check (billing_period in ('unico', 'mensal', 'trimestral', 'anual')),
  payment_method     text,
  notes              text,
  signed_at          date,
  signed_document_url text,
  created_by         uuid references public.app_user(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger contract_set_updated_at
  before update on public.contract
  for each row execute function public.set_updated_at();

create index contract_ws_idx on public.contract (workspace_id, status);
create index contract_client_idx on public.contract (client_id);

alter table public.contract enable row level security;

create policy contract_select on public.contract
  for select using (public.has_role(workspace_id, array['owner', 'admin']));
create policy contract_write on public.contract
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));
