-- =====================================================================
-- TAFLOW — 0101_relatorio_de_csp
-- Onde as violações da CSP em modo relatório são somadas.
--
-- A CSP entra primeiro como `Content-Security-Policy-Report-Only`: ela não
-- bloqueia nada, só avisa o que bloquearia. Sem um lugar para esses avisos
-- caírem, o modo relatório não serve para nada — o navegador manda e
-- ninguém lê.
--
-- **A TABELA SOMA, NÃO EMPILHA.** Uma linha por (diretiva, origem barrada,
-- rota), com um contador. Três razões, e a terceira é a que importa:
--
--   1. o relatório vira legível — cinco linhas em vez de cinco mil;
--   2. uma página com uma imagem barrada avisa a cada carregamento, e
--      guardar cada aviso encheria o banco por nada;
--   3. **a rota é pública** (o navegador reporta sem sessão, por
--      definição). Somar num contador faz uma enxurrada de avisos forjados
--      custar um `update` por combinação, em vez de crescer sem fim.
--
-- **O QUE NÃO ENTRA AQUI, E ESSE É O CUIDADO PRINCIPAL.** Um aviso de CSP
-- carrega o endereço completo da página e do recurso barrado, e no TAFLOW
-- endereço tem segredo dentro: `/d/<token>` é o link do cliente, e uma URL
-- assinada do storage leva a assinatura na query. Guardar isso em claro
-- transformaria a tabela de diagnóstico num depósito de tokens. Por isso o
-- servidor reduz antes de gravar: do recurso barrado fica só a ORIGEM, e da
-- página fica só o FORMATO da rota (`/d/:id`), com todo identificador
-- trocado. Quem faz isso é `lib/seguranca/csp.ts`, com teste.
--
-- Vida curta de propósito: isto existe para a semana de medição. Quando a
-- CSP passar a valer de verdade, a tabela e a rota saem juntas.
-- =====================================================================

create table public.csp_report (
  id uuid primary key default gen_random_uuid(),

  -- 'img-src', 'connect-src'... a diretiva que teria barrado.
  directive text not null,

  -- Só a origem: 'https://exemplo.com'. Pode ser 'inline' ou 'eval' quando
  -- o que foi barrado não tem origem.
  blocked_origin text not null,

  -- O FORMATO da rota, com os identificadores trocados: '/tarefa/:id'.
  document_path text not null,

  ocorrencias integer not null default 1,
  primeiro_em timestamptz not null default now(),
  ultimo_em timestamptz not null default now(),

  -- A chave da soma.
  unique (directive, blocked_origin, document_path)
);

-- RLS ligada e NENHUMA policy, como em `api_key` (0075): ninguém alcança
-- esta tabela pelo navegador, nem para ler nem para escrever. Quem grava é
-- a rota, com a chave secreta; quem lê é você, pelo painel do Supabase.
alter table public.csp_report enable row level security;

comment on table public.csp_report is
  'Violações da CSP em modo relatório, somadas por diretiva/origem/rota (0101). Sem URL completa: endereço no TAFLOW carrega token.';

-- ------------------------------------------------------------ registrar
--
-- Uma função em vez de um upsert pelo cliente: somar precisa ser atômico.
-- Dois avisos do mesmo tipo chegando juntos, com `select` e depois
-- `update`, perderiam uma contagem — e, pior, poderiam errar o
-- `primeiro_em`.
create or replace function public.registrar_csp(
  p_directive text,
  p_origem    text,
  p_rota      text
)
returns void
language sql
security definer
set search_path = public
as $fn$
  insert into public.csp_report (directive, blocked_origin, document_path)
  values (p_directive, p_origem, p_rota)
  on conflict (directive, blocked_origin, document_path) do update
    set ocorrencias = public.csp_report.ocorrencias + 1,
        ultimo_em   = now();
$fn$;

comment on function public.registrar_csp(text, text, text) is
  'Soma uma violação de CSP (0101). Só o servidor chama: a rota pública valida e reduz antes.';

-- A lição da 0094: `revoke from public` não tira o grant padrão de `anon`,
-- e esta função escreve. Só a chave secreta executa.
revoke all on function public.registrar_csp(text, text, text)
  from public, anon, authenticated;
grant execute on function public.registrar_csp(text, text, text) to service_role;
