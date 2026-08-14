-- =====================================================================
-- TarefaFácil — 0022_demanda_v2
-- Aprofunda o módulo Demandas (rodada 1):
--  1) cancelamento como status distinto de concluído (cancelled_at);
--  2) prioridade de 5 níveis (adiciona 'urgente' e 'sem_prioridade',
--     mantém 'baixa'/'media'/'alta' — sem migração de dados);
--  3) tipo de demanda / serviço (campo livre, filtrável);
--  4) search_tasks passa a entender cancelada/atrasada e filtro por serviço.
-- =====================================================================

alter table public.task
  add column if not exists cancelled_at timestamptz,
  add column if not exists service text;

comment on column public.task.cancelled_at is
  'Demanda cancelada (distinto de concluída). Nunca ambos ao mesmo tempo.';
comment on column public.task.service is
  'Tipo de demanda / serviço — texto livre, filtrável.';

alter table public.task drop constraint if exists task_priority_check;
alter table public.task add constraint task_priority_check
  check (priority in ('sem_prioridade', 'baixa', 'media', 'alta', 'urgente'));

create index if not exists task_service_idx on public.task (workspace_id, service)
  where service is not null;

-- Busca: status ganha 'cancelada' e 'atrasada'; 'aberta' agora exclui
-- cancelada; novo filtro p_service (ILIKE, texto livre).
-- IMPORTANTE: assinatura muda (novo parâmetro) — create or replace NÃO troca
-- a função nesse caso, cria uma sobrecarga. Precisa dropar a antiga primeiro.
drop function if exists public.search_tasks(
  text, uuid[], uuid[], text[], text, date, date
);

create or replace function public.search_tasks(
  q text default '',
  p_sectors uuid[] default null,
  p_tags uuid[] default null,
  p_priorities text[] default null,
  p_status text default null,
  p_due_from date default null,
  p_due_to date default null,
  p_service text default null
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
      or (p_status = 'aberta'
          and t.completed_at is null and t.cancelled_at is null)
      or (p_status = 'concluida' and t.completed_at is not null)
      or (p_status = 'cancelada' and t.cancelled_at is not null)
      or (p_status = 'atrasada'
          and t.completed_at is null and t.cancelled_at is null
          and t.due_date is not null and t.due_date < current_date)
    )
    and (p_due_from is null or t.due_date >= p_due_from)
    and (p_due_to is null or t.due_date <= p_due_to)
    and (p_service is null or t.service ilike '%' || p_service || '%')
    and (
      p_tags is null
      or exists (
        select 1
        from public.task_tag tt
        where tt.task_id = t.id and tt.tag_id = any (p_tags)
      )
    )
  order by
    (t.completed_at is not null or t.cancelled_at is not null),
    t.due_date asc nulls last,
    t.created_at desc;
$$;

grant execute on function public.search_tasks(
  text, uuid[], uuid[], text[], text, date, date, text
) to authenticated;
