-- =====================================================================
-- TarefaFácil — 0041_chat_orphan_notice
-- Defeito encontrado em produção: apagar uma demanda deixava o aviso dela
-- no chat apontando para um id que não existe mais, e clicar abria um
-- painel de tarefa fantasma.
--
-- A mensagem NÃO é apagada de propósito: "Fulano criou a demanda X"
-- continua sendo verdade sobre o que aconteceu, e o chat é registro da
-- conversa. O que se perde é só o link — a interface já desabilita o clique
-- quando não há entity_id.
--
-- `entity_id` não é chave estrangeira porque aponta para entidades de tipos
-- diferentes; por isso a limpeza precisa de trigger.
-- =====================================================================

create or replace function public.clear_task_notice_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_message
  set entity_type = null, entity_id = null
  where entity_type = 'task' and entity_id = old.id;
  return old;
end;
$$;

create trigger task_chat_notice_cleanup
  before delete on public.task
  for each row execute function public.clear_task_notice_link();

-- Conserta o que já ficou órfão.
update public.chat_message m
set entity_type = null, entity_id = null
where m.entity_type = 'task'
  and not exists (select 1 from public.task t where t.id = m.entity_id);
