-- =====================================================================
-- TarefaFácil — 0057_service
-- Catálogo de serviços: o que a agência vende, e por quanto.
--
-- Hoje o valor é digitado à mão em cada negociação, em cada contrato e em
-- cada lançamento. Quem vende "Identidade visual" doze vezes no ano digita
-- 2.500,00 doze vezes — e erra uma.
--
-- Três decisões:
--
-- 1. O PREÇO AQUI É TABELA, NÃO CONTRATO. Editar o valor do serviço não
--    mexe em negociação, contrato ou lançamento já criados: eles guardaram
--    o número no momento em que foram feitos. É a mesma regra que a 0050
--    aplicou a plano e fatura, pelo mesmo motivo — histórico que muda
--    sozinho deixa de ser histórico.
--
-- 2. SERVIÇO NÃO SE APAGA, SE DESATIVA. Serviço que saiu de linha continua
--    existindo porque negociações antigas apontam para ele. `active = false`
--    tira da lista de escolha e mantém o registro.
--
-- 3. `task.service` (TEXTO LIVRE) CONTINUA COMO ESTÁ. Ela nasceu antes
--    disto e não vale uma migração de dados agora; quando o catálogo estiver
--    em uso, ela vira referência. Duas coisas com o mesmo nome é ruim, e
--    está registrado aqui para não passar despercebido.
-- =====================================================================

create table public.service (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  name         text not null check (char_length(name) between 1 and 120),
  price_cents  bigint not null default 0 check (price_cents >= 0),

  /** "por mês", "por peça", "único" — rótulo curto que vai junto do preço. */
  unit         text check (unit is null or char_length(unit) <= 24),

  active       boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index service_workspace_idx on public.service (workspace_id, name);

create trigger service_touch
  before update on public.service
  for each row execute function public.set_updated_at();

alter table public.service enable row level security;

create policy service_select on public.service
  for select using (public.is_member(workspace_id));
create policy service_write on public.service
  for all
  using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));

-- Quem apagou um serviço entra na mesma trilha do resto.
create or replace function public.audit_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rotulo text;
  nome text;
  quem text := coalesce(public.actor_name(), 'Alguém');
begin
  rotulo := case tg_table_name
    when 'task'    then 'a demanda'
    when 'client'  then 'o cliente'
    when 'sector'  then 'o setor'
    when 'project' then 'o projeto'
    when 'deal'    then 'a negociação'
    when 'service' then 'o serviço'
    else tg_table_name
  end;

  nome := coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name', '?');

  perform public.write_audit(
    old.workspace_id, 'excluiu', tg_table_name, old.id,
    quem || ' excluiu ' || rotulo || ' "' || nome || '"',
    null);

  return old;
end;
$fn$;

create trigger service_audit_delete
  after delete on public.service
  for each row execute function public.audit_deletion();
