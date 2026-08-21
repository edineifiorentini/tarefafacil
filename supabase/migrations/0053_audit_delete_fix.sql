-- =====================================================================
-- TarefaFácil — 0053_audit_delete_fix
-- Apagar um workspace estava falhando. Apagar um usuário também.
--
-- O que acontecia: `delete from workspace` remove a linha do workspace e só
-- então a cascata apaga setor, demanda, cliente, projeto e membros. Os
-- gatilhos AFTER DELETE dessas tabelas chamavam `write_audit`, que tentava
-- inserir em `audit_log` uma linha apontando para um workspace que já não
-- existe:
--
--   insert or update on table "audit_log" violates foreign key constraint
--   "audit_log_workspace_id_fkey"
--
-- Ou seja: o botão "Remover cliente" do painel só funcionava em workspace
-- vazio — e nenhum workspace é vazio desde a 0051, que dá um setor "Geral"
-- a todo mundo no cadastro.
--
-- Duas correções:
--
-- 1. `write_audit` não escreve quando o workspace já foi embora. A trilha
--    morre junto com o workspace de qualquer jeito (cascade, decisão da
--    0044); tentar registrar a própria demolição só derrubava a demolição.
--
-- 2. `audit_membership` não monta mais frase com valor nulo. Ao apagar um
--    usuário, a cascata tira o `app_user` antes do `workspace_member`, então
--    o nome do alvo vinha nulo e a concatenação inteira virava nulo — que
--    esbarrava no `summary not null`.
-- =====================================================================

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
  select ws, auth.uid(), acao, tipo, id_entidade,
         coalesce(resumo, 'Registro sem descrição'), detalhes
  where exists (select 1 from public.workspace where id = ws);
$fn$;

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

  -- Sem `select into` que casou nada, `alvo` fica nulo — e frase com nulo
  -- vira nulo inteiro.
  alvo := coalesce(alvo, 'usuário');

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
