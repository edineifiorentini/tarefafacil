-- =====================================================================
-- TAFLOW — 0098_destinos_da_tarefa
-- Onde cada demanda vai ser publicada: Instagram, rádio, impresso...
--
-- Aprovado pelo dono em 11/set/2026, a partir de um protótipo. Uma demanda
-- pode ir para vários destinos, ou para nenhum — o relatório interno
-- continua sem destino, como sempre foi.
--
-- POR QUE UMA COLUNA `text[]` E NÃO UMA TABELA. A lista é do sistema, não
-- de cada empresa (lista própria por empresa ficou registrada para depois,
-- no roadmap), e a pergunta que se faz é sempre "para onde vai ESTA
-- demanda". O array responde isso sem join, e o índice GIN deixa pronto o
-- filtro "tudo que vai para o Instagram" quando ele vier.
--
-- A TRAVA É FUNÇÃO, e não um `check` direto: a regra precisa recusar id
-- desconhecido E repetição, e `check` não aceita subconsulta. A lista daqui
-- tem de bater com `lib/tarefas/destinos.ts` — o teste do catálogo lê este
-- arquivo e falha se as duas divergirem. Mudou um lado, muda o outro na
-- mesma migration nova.
-- =====================================================================

create or replace function public.destinos_validos(p_destinos text[])
returns boolean
language sql
immutable
set search_path = public
as $fn$
  select p_destinos <@ array[
      'instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'site',
      'linkedin', 'x', 'threads', 'telegram', 'email',
      'impresso', 'radio', 'tv', 'midia_exterior', 'imprensa'
    ]::text[]
    and cardinality(p_destinos) = (
      select count(distinct d) from unnest(p_destinos) as d
    );
$fn$;

comment on function public.destinos_validos(text[]) is
  'Trava de task.destinos (0098): só ids do catálogo, sem repetição. A lista espelha lib/tarefas/destinos.ts.';

-- `default '{}'` e `not null`: toda demanda que já existe nasce sem destino,
-- e nenhuma leitura precisa tratar nulo como caso especial.
alter table public.task
  add column destinos text[] not null default '{}'
    constraint task_destinos_validos check (public.destinos_validos(destinos));

comment on column public.task.destinos is
  'Onde a demanda vai ser publicada (0098). Ids do catálogo em lib/tarefas/destinos.ts, na ordem do catálogo, sem repetição.';

create index task_destinos_idx on public.task using gin (destinos);
