-- =====================================================================
-- TarefaFácil — 0008_search  (E15)
-- Busca full-text (config portuguese) em título/descrição da tarefa e no
-- corpo dos insights, + RPC com filtros combináveis. RLS aplica (SECURITY
-- INVOKER): o usuário só busca no próprio workspace.
-- =====================================================================

-- Índices GIN de expressão: a expressão precisa bater EXATAMENTE com a usada
-- na consulta para o planejador usar o índice.
create index if not exists task_fts_idx on public.task using gin (
  to_tsvector(
    'portuguese',
    coalesce(title, '') || ' ' || coalesce(description, '')
  )
);

create index if not exists insight_fts_idx on public.insight using gin (
  to_tsvector('portuguese', coalesce(body, ''))
);

create index if not exists task_due_date_idx on public.task (due_date);

-- Busca com filtros. q vazio → só os filtros. Status: 'aberta' | 'concluida'.
create or replace function public.search_tasks(
  q text default '',
  p_sectors uuid[] default null,
  p_tags uuid[] default null,
  p_priorities text[] default null,
  p_status text default null,
  p_due_from date default null,
  p_due_to date default null
)
returns setof public.task
language sql
stable
security invoker
set search_path = public
as $$
  select t.*
  from public.task t
  where
    (
      coalesce(q, '') = ''
      or to_tsvector(
           'portuguese',
           coalesce(t.title, '') || ' ' || coalesce(t.description, '')
         ) @@ websearch_to_tsquery('portuguese', q)
      or exists (
        select 1
        from public.insight i
        where i.task_id = t.id
          and to_tsvector('portuguese', coalesce(i.body, ''))
              @@ websearch_to_tsquery('portuguese', q)
      )
    )
    and (p_sectors is null or t.sector_id = any (p_sectors))
    and (p_priorities is null or t.priority = any (p_priorities))
    and (
      p_status is null
      or (p_status = 'aberta' and t.completed_at is null)
      or (p_status = 'concluida' and t.completed_at is not null)
    )
    and (p_due_from is null or t.due_date >= p_due_from)
    and (p_due_to is null or t.due_date <= p_due_to)
    and (
      p_tags is null
      or exists (
        select 1
        from public.task_tag tt
        where tt.task_id = t.id and tt.tag_id = any (p_tags)
      )
    )
  order by (t.completed_at is not null), t.due_date asc nulls last, t.created_at desc;
$$;

grant execute on function public.search_tasks(
  text, uuid[], uuid[], text[], text, date, date
) to authenticated;
