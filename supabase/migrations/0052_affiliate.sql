-- =====================================================================
-- TarefaFácil — 0052_affiliate
-- Indicação: alguém divulga o TarefaFácil, o cliente entra pelo link dele
-- e a comissão fica registrada.
--
-- Três decisões que valem para sempre:
--
-- 1. A EMPRESA GUARDA CÓPIA DO PERCENTUAL (`affiliate_percent`). Se amanhã
--    o afiliado passar de 20% para 10%, quem ele já trouxe continua valendo
--    20% — foi o combinado quando a indicação aconteceu. Ler o percentual
--    atual na hora de calcular faria o acordo mudar sozinho.
--
-- 2. CLIQUE NÃO GUARDA IP. Guarda origem e navegador, que bastam para saber
--    de onde veio a divulgação. IP é dado pessoal e não muda nenhuma
--    decisão aqui.
--
-- 3. NINGUÉM LÊ ESTAS TABELAS PELO CLIENTE. RLS ligada e sem policy: só a
--    chave secreta (rotas /api/admin e o registro de clique) enxerga. Não
--    há tela de afiliado logado ainda; quando houver, ganha policy própria.
-- =====================================================================

create table public.affiliate (
  id     uuid primary key default gen_random_uuid(),
  name   text not null check (char_length(name) between 1 and 120),
  email  text,
  phone  text,

  /** Trecho do link de indicação: tarefafacil.com/r/<code>. */
  code   text not null unique check (code ~ '^[a-z0-9-]{3,32}$'),

  /** Comissão sobre a mensalidade, em pontos percentuais. */
  commission_percent smallint not null default 20
    check (commission_percent between 0 and 100),

  active     boolean not null default true,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger affiliate_touch
  before update on public.affiliate
  for each row execute function public.set_updated_at();

create table public.affiliate_click (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate(id) on delete cascade,
  referrer     text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index affiliate_click_by_affiliate_idx
  on public.affiliate_click (affiliate_id, created_at desc);

alter table public.workspace
  -- Afiliado apagado não apaga a empresa que ele trouxe.
  add column affiliate_id uuid references public.affiliate(id) on delete set null,
  -- A cópia do item 1. Fica null quando não houve indicação.
  add column affiliate_percent smallint
    check (affiliate_percent between 0 and 100);

create index workspace_by_affiliate_idx
  on public.workspace (affiliate_id)
  where affiliate_id is not null;

alter table public.affiliate       enable row level security;
alter table public.affiliate_click enable row level security;
