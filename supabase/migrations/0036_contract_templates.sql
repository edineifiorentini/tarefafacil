-- =====================================================================
-- TarefaFácil — 0036_contract_templates
-- Contratos rodada 2, fatia 2: modelos com variáveis + snapshot imutável
-- (spec 9.4).
--
-- O corpo é TEXTO com marcadores {{...}}, nunca HTML: o spec exige impedir
-- script na prévia/PDF, e não aceitar HTML elimina a classe de risco em vez
-- de tentar filtrá-la.
--
-- `version` sobe a cada edição do corpo. O contrato guarda o texto JÁ
-- RESOLVIDO em body_snapshot ao sair de rascunho — assim nem alterar o
-- modelo nem alterar o cadastro do cliente muda um contrato já enviado.
-- =====================================================================

create table public.contract_template (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name         text not null,
  body         text not null default '',
  version      integer not null default 1,
  archived_at  timestamptz,
  created_by   uuid references public.app_user(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger contract_template_set_updated_at
  before update on public.contract_template
  for each row execute function public.set_updated_at();

create index contract_template_ws_idx on public.contract_template (workspace_id)
  where archived_at is null;

alter table public.contract_template enable row level security;

-- Leitura por membro (para escolher o modelo); escrita só dono/admin,
-- como manda o spec ("editor restrito a usuários autorizados").
create policy contract_template_select on public.contract_template
  for select using (public.is_member(workspace_id));
create policy contract_template_write on public.contract_template
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

alter table public.contract
  add column if not exists template_id uuid
    references public.contract_template(id) on delete set null,
  add column if not exists template_version integer,
  add column if not exists body_snapshot text,
  add column if not exists snapshot_at timestamptz;

comment on column public.contract.body_snapshot is
  'Texto do contrato já com as variáveis resolvidas, congelado quando sai de rascunho. Imutável: nem editar o modelo nem editar o cliente altera contrato enviado/assinado.';
