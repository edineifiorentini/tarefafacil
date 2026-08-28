-- =====================================================================
-- 0078 — O que alimenta a fila de webhook
--
-- MUDANÇA DE RUMO, registrada por honestidade: o plano da seção 23 dizia que
-- a CAMADA DE APLICAÇÃO enfileiraria os eventos, para ter o contexto da
-- origem. Ao instrumentar, descobriu-se que não dá — e o motivo é estrutural.
--
-- As demandas são alteradas NO NAVEGADOR, por `lib/queries/useTasks.ts`, com
-- supabase-js e RLS. Não existe rota de servidor no meio. Isso significa:
--
--   - o cliente não tem a chave secreta para escrever na fila;
--   - e mesmo que tivesse, não dá para confiar: um cliente modificado
--     escolheria não enfileirar, ou enfileiraria evento que não aconteceu.
--
-- Mover as mutações para rotas de servidor quebraria a regra 6 do CLAUDE.md
-- (mutações otimistas, a interface não espera o servidor) e seria reescrever
-- o produto inteiro por causa de um recurso acessório.
--
-- O gatilho resolve os três problemas de uma vez: roda no servidor, dispara
-- em QUALQUER caminho de escrita, e o cliente não alcança.
--
-- E a regra 9 (subtarefa não gera evento) passa a valer POR CONSTRUÇÃO:
-- `subtask` é outra tabela, e este gatilho é de `task`. Não há como uma
-- marcação de subtarefa chegar aqui nem por engano.
--
-- O catálogo continua explícito — o mapeamento de coluna para nome de evento
-- está escrito abaixo, um a um. Renomear uma coluna interna obriga a mexer
-- aqui, que é exatamente o lembrete de que existe um contrato lá fora.
-- =====================================================================

create or replace function public.task_enqueue_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_evento  text;
  v_task    record;
  v_empresa record;
  v_dest    record;
begin
  -- TUDO ENVOLVIDO EM exception: este gatilho roda DENTRO da transação de
  -- quem mexeu na demanda. Se ele falhar, a demanda não é salva. Perder um
  -- evento é ruim; impedir alguém de concluir uma tarefa porque um webhook
  -- teve problema é inaceitável.
  begin
    if TG_OP = 'INSERT' then
      v_evento := 'demanda.criada';
      v_task := new;
    elsif TG_OP = 'DELETE' then
      v_evento := 'demanda.excluida';
      v_task := old;
    else
      v_task := new;
      -- Ordem de precedência: o fato mais forte ganha. Concluir uma demanda
      -- e movê-la na mesma escrita é uma conclusão, não uma movimentação.
      if new.completed_at is null and old.completed_at is not null then
        v_evento := 'demanda.reaberta';
      elsif new.completed_at is not null and old.completed_at is null then
        v_evento := 'demanda.concluida';
      elsif new.assignee_id is distinct from old.assignee_id then
        v_evento := 'demanda.atribuida';
      elsif new.column_id is distinct from old.column_id then
        v_evento := 'demanda.movida';
      end if;
    end if;

    -- Alteração que não vira evento do catálogo (título, prazo, prioridade):
    -- sai sem fazer nada. Publicar um evento genérico de "mudou" obrigaria
    -- todo cliente a adivinhar o que mudou.
    if v_evento is null then
      return coalesce(new, old);
    end if;

    select id, name into v_empresa
      from public.workspace where id = v_task.workspace_id;
    if not found then
      return coalesce(new, old);
    end if;

    for v_dest in
      select id from public.webhook_endpoint
       where workspace_id = v_task.workspace_id
         and ativo
         and v_evento = any(eventos)
    loop
      insert into public.webhook_delivery
        (endpoint_id, workspace_id, evento, corpo, origem_key_id)
      values (
        v_dest.id,
        v_task.workspace_id,
        v_evento,
        jsonb_build_object(
          'versao', 1,
          'evento', v_evento,
          'ocorridoEm', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          -- Um id por ENTREGA: é o que o destino usa para ser idempotente, e
          -- duas inscrições com o mesmo id atrapalhariam quem guarda "já
          -- processei este".
          'entregaId', gen_random_uuid(),
          'empresa', jsonb_build_object('id', v_empresa.id, 'nome', v_empresa.name),
          'dados', jsonb_build_object(
            'id', v_task.id,
            'titulo', v_task.title,
            'setorId', v_task.sector_id,
            'projetoId', v_task.project_id,
            'colunaId', v_task.column_id,
            'responsavelId', v_task.assignee_id,
            'prioridade', v_task.priority,
            'prazo', v_task.due_date,
            'concluidaEm', v_task.completed_at
          )
        ),
        -- ORIGEM: nula por enquanto, e corretamente. Hoje toda mudança vem
        -- de uma pessoa pela interface — não existe API pública, então não há
        -- chave agindo. Quando existir, ela será servidor e poderá informar a
        -- origem; é aqui que a leitura entra, com guarda para não derrubar a
        -- transação com um valor mal formado.
        null
      );
    end loop;

  exception when others then
    -- Silencioso de propósito, e é a decisão mais importante do arquivo.
    raise warning 'webhook enqueue falhou para task %: %', coalesce(new.id, old.id), sqlerrm;
  end;

  return coalesce(new, old);
end;
$fn$;

create trigger task_enqueue_webhook_trigger
  after insert or update or delete on public.task
  for each row execute function public.task_enqueue_webhook();

comment on function public.task_enqueue_webhook is
  'Alimenta webhook_delivery a partir de mudanças em task (0078). Gatilho e '
  'não aplicação porque as demandas são alteradas no navegador, sem rota de '
  'servidor no meio. Subtarefa não chega aqui: é outra tabela.';
