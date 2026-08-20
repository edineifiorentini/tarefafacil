-- =====================================================================
-- TarefaFácil — 0049_subscription
-- Assinatura do próprio SaaS (cobrança de quem usa o sistema).
--
-- O corte por inadimplência NÃO é inventado aqui: `access_expires_at` já
-- existe desde a 0016 e `has_role` (0017/0018/0019) já bloqueia toda
-- escrita quando a data passa — workspace vencido fica somente-leitura.
-- Assinatura, portanto, é o mecanismo que EMPURRA essa data. Nada de um
-- segundo portão: dois lugares decidindo quem pode escrever é como se cria
-- a brecha em que um deles esquece de fechar.
--
-- Provedor fica em coluna, não no nome das tabelas. Trocar de gateway não
-- pode exigir migração de schema.
-- =====================================================================

create table public.billing_plan (
  code        text primary key check (code in ('free', 'pro', 'team')),
  name        text not null,
  price_cents integer not null check (price_cents >= 0),
  seat_limit  integer not null check (seat_limit > 0),
  active      boolean not null default true
);

insert into public.billing_plan (code, name, price_cents, seat_limit) values
  ('free', 'Gratuito',  0,     3),
  ('pro',  'Pro',       9900,  10),
  ('team', 'Equipe',    24900, 50);

create table public.subscription (
  workspace_id uuid primary key references public.workspace(id) on delete cascade,
  plan_code    text not null references public.billing_plan(code),

  -- 'ativa'     em dia
  -- 'pendente'  cobrança aberta, ainda dentro do prazo
  -- 'vencida'   passou do prazo e da carência — o acesso já caiu sozinho
  --             porque access_expires_at ficou para trás
  -- 'cancelada' o dono pediu para sair
  status       text not null default 'ativa'
                 check (status in ('ativa', 'pendente', 'vencida', 'cancelada')),

  /** Dia do mês em que a fatura nasce. Guardado para o ciclo não andar. */
  billing_day  integer not null default 1 check (billing_day between 1 and 28),

  provider     text not null default 'efi',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger subscription_touch
  before update on public.subscription
  for each row execute function public.set_updated_at();

create table public.subscription_charge (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  plan_code    text not null references public.billing_plan(code),
  amount_cents integer not null check (amount_cents > 0),

  period_start date not null,
  period_end   date not null check (period_end > period_start),

  status       text not null default 'aberta'
                 check (status in ('aberta', 'paga', 'expirada', 'cancelada')),

  -- Identificadores do provedor. `txid` é o do Pix da EFI.
  provider           text not null default 'efi',
  provider_charge_id text,
  qr_code            text,
  copia_e_cola       text,
  expires_at         timestamptz,

  paid_at           timestamptz,
  paid_amount_cents integer,

  created_at   timestamptz not null default now()
);

-- UM ciclo, UMA cobrança. É esta restrição que impede o cron de cobrar duas
-- vezes o mesmo mês se rodar duas vezes — a idempotência mora no banco, não
-- na esperança de que o job rode certo.
create unique index subscription_charge_ciclo_idx
  on public.subscription_charge (workspace_id, period_start);

create index subscription_charge_aberta_idx
  on public.subscription_charge (status, expires_at)
  where status = 'aberta';

/**
 * Eventos recebidos do provedor.
 *
 * Webhook de pagamento é reenviado: a EFI repete a notificação até receber
 * 200, e uma queda de rede no meio faz o mesmo pagamento chegar duas vezes.
 * Sem esta tabela, o segundo aviso empurraria o acesso mais um mês de
 * graça. O `unique` é a defesa.
 */
create table public.payment_event (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'efi',
  external_id  text not null,
  payload      jsonb,
  received_at  timestamptz not null default now()
);

create unique index payment_event_unico_idx
  on public.payment_event (provider, external_id);

alter table public.billing_plan enable row level security;
alter table public.subscription enable row level security;
alter table public.subscription_charge enable row level security;
alter table public.payment_event enable row level security;

-- Catálogo é público para quem está logado: a tela de plano precisa dele.
create policy billing_plan_read on public.billing_plan
  for select to authenticated using (true);

-- A assinatura é assunto do dono. Nem admin do workspace vê valor —
-- contratar e pagar é decisão de quem responde pela conta.
create policy subscription_owner on public.subscription
  for select using (
    exists (
      select 1 from public.workspace w
      where w.id = subscription.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy subscription_charge_owner on public.subscription_charge
  for select using (
    exists (
      select 1 from public.workspace w
      where w.id = subscription_charge.workspace_id
        and w.owner_user_id = auth.uid()
    )
  );

-- Sem policy de escrita em nenhuma das duas, e nenhuma leitura em
-- payment_event: quem cria cobrança e marca como paga é o servidor, com a
-- chave secreta. Cliente que consegue escrever "paga" não tem cobrança.

-- Toda organização que já existe começa no plano em que está hoje, sem
-- cobrança retroativa — ninguém deve por ter usado antes de haver cobrança.
insert into public.subscription (workspace_id, plan_code)
select w.id, w.plan from public.workspace w
on conflict do nothing;
