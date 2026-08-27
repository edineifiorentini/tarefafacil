-- =====================================================================
-- 0072 — Auditoria de plataforma
--
-- PROBLEMA: `audit_log.workspace_id` é `not null`. Ação de plataforma —
-- criar plano, mudar a política de cadastro, editar afiliado, suspender uma
-- empresa — não pertence a nenhum workspace, e por isso hoje simplesmente
-- não é registrada. A especificação 15 exige trilha para exatamente esses
-- eventos.
--
-- SOLUÇÃO: `workspace_id` passa a aceitar null, e null significa "escopo
-- plataforma".
--
-- POR QUE NÃO UMA TABELA NOVA: a leitura da auditoria seria uma união de
-- duas tabelas com as mesmas sete colunas, e todo filtro precisaria ser
-- escrito duas vezes. A diferença entre os dois casos é o escopo, não a
-- forma do evento.
--
-- CUIDADO COM O CASCADE: `workspace_id` apaga em cascata junto com a
-- empresa. Evento de plataforma SOBRE uma empresa (por exemplo "suspendeu a
-- empresa X") não deve morrer quando a empresa for excluída — por isso ele
-- grava `workspace_id = null` e guarda a empresa em
-- `entity_type = 'workspace'` + `entity_id`, que não tem chave estrangeira.
-- =====================================================================

alter table public.audit_log
  alter column workspace_id drop not null;

-- A política antiga comparava `has_role(workspace_id, ...)`. Com null isso
-- devolve null, que já não é `true` — mas deixar implícito é frágil. Aqui
-- fica escrito: evento de plataforma NUNCA é visível para cliente.
drop policy if exists audit_log_select on public.audit_log;

create policy audit_log_select on public.audit_log
  for select using (
    workspace_id is not null
    and public.has_role(workspace_id, array['owner', 'admin'])
  );

-- Busca dos eventos de plataforma: parcial, porque são poucos perto do
-- volume por empresa.
create index if not exists audit_log_platform_idx
  on public.audit_log (created_at desc)
  where workspace_id is null;

-- ---------------------------------------------------------------------
-- Escrita
--
-- Mesmo motivo da 0067: `write_audit` monta o autor a partir de
-- `auth.uid()`, que é NULL na conexão com a chave secreta. A rota
-- administrativa roda com essa chave, então o autor entra por parâmetro.
--
-- Revogada de `authenticated`: quem tem sessão comum não pode escrever
-- evento de plataforma nenhum, muito menos assinando com o nome de outro.
-- ---------------------------------------------------------------------
create or replace function public.write_platform_audit(
  autor text,
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
as $$
  insert into public.audit_log
    (workspace_id, actor_id, action, entity_type, entity_id, summary, details)
  values
    (null, null, acao, tipo, id_entidade,
     autor || ' ' || resumo,
     coalesce(detalhes, '{}'::jsonb) || jsonb_build_object('ator', autor));
$$;

revoke all on function public.write_platform_audit(text, text, text, uuid, text, jsonb)
  from public, authenticated, anon;
grant execute on function public.write_platform_audit(text, text, text, uuid, text, jsonb)
  to service_role;
