-- =====================================================================
-- TAFLOW — 0081_finance_classification
-- Alicerce de dados do financeiro: categoria de verdade, projeto e setor
-- no lançamento, e preço da hora.
--
-- Pedido do dono em 31/ago/2026, junto com a lista de funções do módulo
-- financeiro. Este é o bloco sem dependência externa — os outros
-- (boleto/Pix, NF-e, conciliação) precisam dele para significar alguma
-- coisa.
--
-- **Retrocompatível de propósito.** A coluna `category` (texto livre)
-- CONTINUA aqui. A migration chega em produção antes do código, e derrubar
-- a coluna junto quebraria o app no intervalo. Ela é preenchida em paralelo
-- durante a transição e sai numa migration futura, quando nada mais a ler.
-- =====================================================================

-- ---------------------------------------------------------------------
-- finance_category — o fim do texto livre
--
-- `category text` deixava "Marketing", "marketing" e "Mkt" virarem três
-- categorias, e todo relatório por categoria nascia errado sem ninguém
-- perceber. O índice único é sobre o nome NORMALIZADO: é ele que impede a
-- terceira grafia de existir.
-- ---------------------------------------------------------------------

create table public.finance_category (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 60),
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create unique index finance_category_nome_unico
  on public.finance_category (workspace_id, lower(trim(name)));

alter table public.finance_category enable row level security;

-- Mesma regra do resto do financeiro (0031): owner e admin, mais ninguém.
create policy finance_category_select on public.finance_category
  for select using (public.has_role(workspace_id, array['owner', 'admin']));
create policy finance_category_write on public.finance_category
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------
-- Classificação do lançamento
--
-- `on delete set null` nos três, e é regra: apagar um projeto, um setor ou
-- uma categoria não pode apagar o histórico financeiro. O lançamento perde
-- a etiqueta, não a existência.
--
-- Setor em vez de "centro de custo": a empresa já tem setores, e criar uma
-- segunda hierarquia paralela faria classificar cada lançamento duas vezes
-- — e as duas divergiriam. Decidido com o dono em 31/ago/2026.
-- ---------------------------------------------------------------------

alter table public.finance_entry
  add column category_id uuid references public.finance_category(id) on delete set null,
  add column project_id  uuid references public.project(id) on delete set null,
  add column sector_id   uuid references public.sector(id) on delete set null;

alter table public.finance_recurrence
  add column category_id uuid references public.finance_category(id) on delete set null,
  add column project_id  uuid references public.project(id) on delete set null,
  add column sector_id   uuid references public.sector(id) on delete set null;

create index finance_entry_project_idx on public.finance_entry (project_id)
  where project_id is not null;
create index finance_entry_sector_idx on public.finance_entry (sector_id)
  where sector_id is not null;

comment on column public.finance_entry.category is
  'DEPRECADA pela 0081. Use category_id. Sai quando nada mais a ler.';

-- ---------------------------------------------------------------------
-- Migração do texto livre
--
-- `distinct on` com `lower(trim())` no ORDER BY colapsa as grafias: de
-- "Marketing" e "marketing" sobra uma linha só. Qual das duas grafias
-- sobrevive é arbitrário e não importa — o que importa é não criar duas.
-- ---------------------------------------------------------------------

insert into public.finance_category (workspace_id, name)
select distinct on (t.workspace_id, lower(trim(t.category)))
       t.workspace_id, trim(t.category)
  from (
    select workspace_id, category from public.finance_entry
     where category is not null and trim(category) <> ''
    union all
    select workspace_id, category from public.finance_recurrence
     where category is not null and trim(category) <> ''
  ) t
 order by t.workspace_id, lower(trim(t.category)), trim(t.category)
    on conflict do nothing;

update public.finance_entry e
   set category_id = c.id
  from public.finance_category c
 where c.workspace_id = e.workspace_id
   and lower(trim(c.name)) = lower(trim(e.category))
   and e.category is not null
   and trim(e.category) <> '';

update public.finance_recurrence r
   set category_id = c.id
  from public.finance_category c
 where c.workspace_id = r.workspace_id
   and lower(trim(c.name)) = lower(trim(r.category))
   and r.category is not null
   and trim(r.category) <> '';

-- ---------------------------------------------------------------------
-- finance_rate — o preço da hora
--
-- **Tabela separada, e a razão é privacidade.** Valor/hora é dado de
-- remuneração. Em `workspace_member` ele vazaria para todo mundo que
-- enxerga a lista de membros; em `workspace` vazaria para qualquer pessoa
-- logada, porque o layout faz `select("*")` nela a cada carregamento.
-- Aqui a policy é a do financeiro: owner e admin.
--
-- `user_id` nulo é o PADRÃO DA EMPRESA. Assim uma empresa liga o custo de
-- trabalho preenchendo um número só, e ajusta por pessoa só onde precisa.
--
-- **Não existe interruptor de "usar custo/hora".** Quem não preenche preço
-- nenhum vê só dinheiro; quem preenche vê a margem com trabalho. A escolha
-- é o dado, não uma configuração — uma chave que muda o SIGNIFICADO de um
-- número faz todo relatório passado mudar retroativamente quando alguém a
-- vira. Decidido com o dono em 31/ago/2026.
-- ---------------------------------------------------------------------

create table public.finance_rate (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  -- Nulo = padrão da empresa. Preenchido = exceção daquela pessoa.
  user_id      uuid references public.app_user(id) on delete cascade,
  hora_cents   integer not null check (hora_cents > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Duas unicidades porque o Postgres trata NULL como distinto: sem a
-- segunda, a empresa acumularia vários "padrões" sem reclamação.
create unique index finance_rate_pessoa
  on public.finance_rate (workspace_id, user_id) where user_id is not null;
create unique index finance_rate_padrao
  on public.finance_rate (workspace_id) where user_id is null;

create trigger finance_rate_set_updated_at
  before update on public.finance_rate
  for each row execute function public.set_updated_at();

alter table public.finance_rate enable row level security;

create policy finance_rate_select on public.finance_rate
  for select using (public.has_role(workspace_id, array['owner', 'admin']));
create policy finance_rate_write on public.finance_rate
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

comment on table public.finance_rate is
  'Preço da hora. user_id nulo = padrão da empresa. Sem linha nenhuma, a rentabilidade conta só dinheiro.';
