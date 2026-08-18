-- =====================================================================
-- TarefaFácil — 0044_audit_log
-- Trilha de auditoria do workspace (spec §15: "trilha de auditoria para
-- financeiro, contratos, permissões e exclusões"; §11: "auditoria de
-- convite, papel e ações sensíveis").
--
-- Já existia histórico POR DEMANDA (task_activity). Isto é outra coisa:
-- quem mexeu em dinheiro, em contrato, em quem pode o quê, e quem apagou.
--
-- Duas decisões estruturais:
--
-- 1. Quem escreve é o trigger. Não há policy de INSERT — as funções são
--    security definer e a RLS de leitura não as alcança. Trilha que o
--    cliente consegue escrever não prova nada.
--
-- 2. A tabela é IMUTÁVEL. Sem policy de UPDATE e sem policy de DELETE, nem
--    para o dono. Trilha que se edita ou se apaga não é trilha — e um dono
--    mal-intencionado é justamente um dos casos que ela existe para cobrir.
--    (Apagar o workspace leva junto, por cascade; isso é intencional.)
-- =====================================================================

create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  -- `set null` para a linha sobreviver à saída de quem agiu: perder o nome
  -- é aceitável, perder o registro do ato não.
  actor_id     uuid references public.app_user(id) on delete set null,
  action       text not null check (action in ('criou', 'alterou', 'excluiu')),
  entity_type  text not null,
  entity_id    uuid,
  -- Frase pronta para leitura. Nunca leva documento, token ou senha (§15).
  summary      text not null,
  -- Só os campos que mudaram, com antes/depois.
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index audit_log_workspace_idx
  on public.audit_log (workspace_id, created_at desc);

alter table public.audit_log enable row level security;

-- Só dono e admin leem. Sem insert/update/delete de propósito.
create policy audit_log_select on public.audit_log
  for select using (public.has_role(workspace_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------
-- Escrita central. Todos os gatilhos passam por aqui.
-- ---------------------------------------------------------------------
create or replace function public.write_audit(
  ws uuid,
  acao text,
  tipo text,
  id_entidade uuid,
  resumo text,
  detalhes jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $fn$
  insert into public.audit_log
    (workspace_id, actor_id, action, entity_type, entity_id, summary, details)
  values (ws, auth.uid(), acao, tipo, id_entidade, resumo, detalhes);
$fn$;

-- Nome de quem está agindo, para a frase do resumo.
create or replace function public.actor_name()
returns text
language sql
security definer
set search_path = public
stable
as $fn$
  select coalesce(display_name, email, 'Alguém')
  from public.app_user where id = auth.uid();
$fn$;

-- ---------------------------------------------------------------------
-- Permissões: entrar, mudar de papel, ser suspenso, sair.
-- ---------------------------------------------------------------------
create or replace function public.audit_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  alvo text;
  quem text := coalesce(public.actor_name(), 'Alguém');
begin
  select coalesce(display_name, email, 'usuário') into alvo
  from public.app_user
  where id = coalesce(new.user_id, old.user_id);

  if tg_op = 'INSERT' then
    perform public.write_audit(
      new.workspace_id, 'criou', 'workspace_member', new.user_id,
      quem || ' adicionou ' || alvo || ' como ' || new.role,
      jsonb_build_object('papel', new.role, 'situacao', new.status));

  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      perform public.write_audit(
        new.workspace_id, 'alterou', 'workspace_member', new.user_id,
        quem || ' mudou o papel de ' || alvo || ' de ' || old.role ||
          ' para ' || new.role,
        jsonb_build_object('de', old.role, 'para', new.role));
    end if;
    if new.status is distinct from old.status then
      perform public.write_audit(
        new.workspace_id, 'alterou', 'workspace_member', new.user_id,
        quem || ' mudou a situação de ' || alvo || ' para ' || new.status,
        jsonb_build_object('de', old.status, 'para', new.status));
    end if;

  else
    perform public.write_audit(
      old.workspace_id, 'excluiu', 'workspace_member', old.user_id,
      quem || ' removeu ' || alvo || ' do workspace',
      jsonb_build_object('papel', old.role));
  end if;

  return coalesce(new, old);
end;
$fn$;

create trigger workspace_member_audit
  after insert or update or delete on public.workspace_member
  for each row execute function public.audit_membership();

-- ---------------------------------------------------------------------
-- Financeiro: valor e situação são o que importa.
-- ---------------------------------------------------------------------
create or replace function public.audit_finance()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  quem text := coalesce(public.actor_name(), 'Alguém');
begin
  if tg_op = 'INSERT' then
    perform public.write_audit(
      new.workspace_id, 'criou', 'finance_entry', new.id,
      quem || ' lançou ' || new.kind || ' "' || new.description || '"',
      jsonb_build_object('valor_centavos', new.amount_cents,
                         'situacao', new.status));

  elsif tg_op = 'UPDATE' then
    if new.amount_cents is distinct from old.amount_cents
       or new.status is distinct from old.status then
      perform public.write_audit(
        new.workspace_id, 'alterou', 'finance_entry', new.id,
        quem || ' alterou o lançamento "' || new.description || '"',
        jsonb_build_object(
          'valor_centavos', jsonb_build_object('de', old.amount_cents,
                                               'para', new.amount_cents),
          'situacao', jsonb_build_object('de', old.status,
                                         'para', new.status)));
    end if;

  else
    perform public.write_audit(
      old.workspace_id, 'excluiu', 'finance_entry', old.id,
      quem || ' excluiu o lançamento "' || old.description || '"',
      jsonb_build_object('valor_centavos', old.amount_cents));
  end if;

  return coalesce(new, old);
end;
$fn$;

create trigger finance_entry_audit
  after insert or update or delete on public.finance_entry
  for each row execute function public.audit_finance();

-- ---------------------------------------------------------------------
-- Contratos: a transição de situação é o ato relevante.
-- ---------------------------------------------------------------------
create or replace function public.audit_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  quem text := coalesce(public.actor_name(), 'Alguém');
begin
  if tg_op = 'INSERT' then
    perform public.write_audit(
      new.workspace_id, 'criou', 'contract', new.id,
      quem || ' criou o contrato "' || new.title || '"',
      jsonb_build_object('situacao', new.status));

  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform public.write_audit(
        new.workspace_id, 'alterou', 'contract', new.id,
        quem || ' mudou "' || new.title || '" de ' || old.status ||
          ' para ' || new.status,
        jsonb_build_object('de', old.status, 'para', new.status));
    end if;

  else
    perform public.write_audit(
      old.workspace_id, 'excluiu', 'contract', old.id,
      quem || ' excluiu o contrato "' || old.title || '"',
      jsonb_build_object('situacao', old.status));
  end if;

  return coalesce(new, old);
end;
$fn$;

create trigger contract_audit
  after insert or update or delete on public.contract
  for each row execute function public.audit_contract();

-- ---------------------------------------------------------------------
-- Exclusões do resto. Aqui só o que some interessa: criar e editar demanda
-- já tem histórico próprio em `task_activity`, e duplicar encheria a trilha
-- de ruído até esconder o que importa.
-- ---------------------------------------------------------------------
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
    else tg_table_name
  end;

  -- `task` tem `title`; os outros têm `name`. O to_jsonb evita um trigger
  -- por tabela só para ler um campo diferente.
  nome := coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name', '?');

  perform public.write_audit(
    old.workspace_id, 'excluiu', tg_table_name, old.id,
    quem || ' excluiu ' || rotulo || ' "' || nome || '"',
    null);

  return old;
end;
$fn$;

create trigger task_audit_delete
  after delete on public.task
  for each row execute function public.audit_deletion();
create trigger client_audit_delete
  after delete on public.client
  for each row execute function public.audit_deletion();
create trigger sector_audit_delete
  after delete on public.sector
  for each row execute function public.audit_deletion();
create trigger project_audit_delete
  after delete on public.project
  for each row execute function public.audit_deletion();
