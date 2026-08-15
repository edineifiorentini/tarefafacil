-- =====================================================================
-- TarefaFácil — 0035_contract_parties
-- Contratos rodada 2, fatia 1: as DUAS partes do contrato.
--
-- Até aqui o documento impresso mostrava apenas o nome do workspace como
-- contratado e o cliente sem endereço nem representante — o que deixava o
-- documento inútil na prática (spec 9.3, blocos "Contratante" e
-- "Contratado").
--
-- Endereço fica como texto livre de propósito: num contrato ele é
-- renderizado como um bloco só. Estruturar em logradouro/número/CEP só
-- valeria a pena com uma integração fiscal, que não existe aqui.
-- =====================================================================

create table public.workspace_profile (
  workspace_id            uuid primary key
                            references public.workspace(id) on delete cascade,
  legal_name              text,  -- razão social do contratado
  document                text,  -- CNPJ
  state_registration      text,  -- inscrição estadual/municipal
  address                 text,
  email                   text,
  phone                   text,
  representative_name     text,
  representative_document text,  -- CPF do representante
  representative_role     text,  -- cargo de quem assina
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger workspace_profile_set_updated_at
  before update on public.workspace_profile
  for each row execute function public.set_updated_at();

alter table public.workspace_profile enable row level security;

-- Leitura por qualquer membro: os dados aparecem no documento do contrato.
-- Escrita só dono/admin: é a identidade fiscal da organização.
create policy workspace_profile_select on public.workspace_profile
  for select using (public.is_member(workspace_id));
create policy workspace_profile_write on public.workspace_profile
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

-- Contratante: o que faltava para identificar o cliente num contrato.
alter table public.client
  add column if not exists address text,
  add column if not exists representative_name text,
  add column if not exists representative_document text;
