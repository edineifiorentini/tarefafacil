-- =====================================================================
-- TarefaFácil — 0050_free_plans
-- Plano deixa de ser enum de três valores e vira cadastro.
--
-- A 0049 (de ontem) modelou plano como `code in ('free','pro','team')`
-- porque a assinatura era do próprio SaaS com preço fixo. O dono pediu um
-- painel onde ele CRIA planos e atribui a cada empresa — cada cliente pode
-- ter o seu, com nome e preço próprios. Enum não serve para isso.
--
-- Duas decisões que valem para sempre:
--
-- 1. A COBRANÇA GUARDA CÓPIA do nome e do valor. Plano é cadastro editável;
--    fatura emitida é fato. Se o preço do plano sobe em novembro, a fatura
--    de setembro precisa continuar dizendo o que foi cobrado. Referência ao
--    plano sem cópia faria o histórico mentir na primeira edição de preço.
--
-- 2. `workspace.plan` (texto) continua existindo e vira legado. Ele não
--    controla nada — quem controla é `seat_limit` e `access_expires_at`.
--    Mantê-lo evita mexer no painel inteiro nesta migração.
-- =====================================================================

alter table public.subscription
  drop constraint subscription_plan_code_fkey;
alter table public.subscription_charge
  drop constraint subscription_charge_plan_code_fkey;

drop table public.billing_plan;

create table public.billing_plan (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  price_cents integer not null check (price_cents >= 0),
  /** Assentos que o plano concede. Vira `workspace.seat_limit` ao atribuir. */
  max_users   integer not null check (max_users > 0),

  /** Aparece para quem se cadastra sozinho. Plano feito sob medida para um
      cliente fica privado — é o caso da maioria. */
  is_public   boolean not null default false,
  active      boolean not null default true,

  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger billing_plan_touch
  before update on public.billing_plan
  for each row execute function public.set_updated_at();

insert into public.billing_plan (name, price_cents, max_users, is_public) values
  ('Gratuito', 0,     3,  true),
  ('Pro',      9900,  10, true),
  ('Equipe',   24900, 50, true);

-- ---------------------------------------------------------------------
-- Empresa aponta para o plano.
-- ---------------------------------------------------------------------
alter table public.workspace
  add column plan_id uuid references public.billing_plan(id) on delete set null,
  -- "Em teste" da referência: período de avaliação, sem cobrança.
  add column trial boolean not null default false,
  -- Contato de quem responde pela conta. Fica na empresa, não no usuário:
  -- é o telefone para cobrar, que nem sempre é o de quem usa o sistema.
  add column contact_email text,
  add column contact_phone text;

-- Quem já existe fica no plano de mesmo nome, quando houver.
update public.workspace w
set plan_id = p.id
from public.billing_plan p
where lower(p.name) = case w.plan
    when 'free' then 'gratuito'
    when 'pro'  then 'pro'
    when 'team' then 'equipe'
  end;

-- ---------------------------------------------------------------------
-- Assinatura e cobrança acompanham.
-- ---------------------------------------------------------------------
alter table public.subscription
  drop column plan_code,
  add column plan_id uuid references public.billing_plan(id) on delete set null;

update public.subscription s
set plan_id = w.plan_id
from public.workspace w where w.id = s.workspace_id;

alter table public.subscription_charge
  drop column plan_code,
  -- Referência solta: se o plano for apagado, a fatura continua contando o
  -- que aconteceu.
  add column plan_id uuid references public.billing_plan(id) on delete set null,
  -- A cópia. É isto que a fatura mostra, não o cadastro atual.
  add column plan_name text not null default 'Plano';

alter table public.subscription_charge
  alter column plan_name drop default;

-- Só o dono da plataforma mexe em plano. A leitura é aberta a quem está
-- logado porque a tela de assinatura precisa mostrar o catálogo.
alter table public.billing_plan enable row level security;

create policy billing_plan_read on public.billing_plan
  for select to authenticated using (true);
