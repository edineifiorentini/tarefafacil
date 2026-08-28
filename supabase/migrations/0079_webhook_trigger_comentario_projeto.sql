-- =====================================================================
-- 0079 — Gatilhos de comentário e projeto
--
-- `comentario.criado` e `projeto.criado` estavam no catálogo desde a 0076 e
-- nunca disparavam. Quem se inscrevesse neles não receberia nada e não teria
-- como descobrir por quê — catálogo que promete evento que não existe é pior
-- do que catálogo curto.
--
-- Mesmo molde da 0078: `after insert`, corpo inteiro dentro de `exception`,
-- e o mapeamento escrito à mão.
--
-- POR QUE UMA FUNÇÃO GENÉRICA E NÃO TRÊS CÓPIAS
--
-- A parte que repete é a busca dos destinos e a montagem do envelope; o que
-- muda é o nome do evento e o bloco `dados`. Isolar o comum num lugar só é o
-- que impede as três de divergirem — no dia em que o envelope ganhar um
-- campo, uma das cópias ficaria para trás e um cliente receberia formatos
-- diferentes do mesmo produto.
-- =====================================================================

create or replace function public.enqueue_webhook(
  p_workspace uuid,
  p_evento    text,
  p_dados     jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_empresa record;
  v_dest    record;
begin
  select id, name into v_empresa from public.workspace where id = p_workspace;
  if not found then
    return;
  end if;

  for v_dest in
    select id from public.webhook_endpoint
     where workspace_id = p_workspace
       and ativo
       and p_evento = any(eventos)
  loop
    insert into public.webhook_delivery
      (endpoint_id, workspace_id, evento, corpo, origem_key_id)
    values (
      v_dest.id,
      p_workspace,
      p_evento,
      jsonb_build_object(
        'versao', 1,
        'evento', p_evento,
        'ocorridoEm', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'entregaId', gen_random_uuid(),
        'empresa', jsonb_build_object('id', v_empresa.id, 'nome', v_empresa.name),
        'dados', p_dados
      ),
      null
    );
  end loop;
end;
$fn$;

comment on function public.enqueue_webhook is
  'Monta o envelope e enfileira para os destinos interessados (0079). O '
  'envelope mora aqui, num lugar só, para os gatilhos não divergirem.';

-- ---------------------------------------------------------------------
-- Comentário
-- ---------------------------------------------------------------------
create or replace function public.comment_enqueue_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  begin
    perform public.enqueue_webhook(
      new.workspace_id,
      'comentario.criado',
      jsonb_build_object(
        'id', new.id,
        'demandaId', new.task_id,
        'autorId', new.author_id,
        -- O TEXTO NÃO VAI. Comentário carrega conversa interna da equipe, e
        -- webhook sai da nossa infraestrutura para um servidor de terceiro
        -- escolhido pelo cliente. Quem precisa do conteúdo busca pela API
        -- com a chave dele, sob a permissão dele.
        'temMencao', array_length(new.mentioned_user_ids, 1) is not null
      )
    );
  exception when others then
    -- Mesma razão da 0078: este gatilho roda dentro da transação de quem
    -- comentou. Falhar aqui impediria a pessoa de comentar.
    raise warning 'webhook enqueue falhou para comentário %: %', new.id, sqlerrm;
  end;
  return new;
end;
$fn$;

create trigger task_comment_enqueue_webhook_trigger
  after insert on public.task_comment
  for each row execute function public.comment_enqueue_webhook();

-- ---------------------------------------------------------------------
-- Projeto
-- ---------------------------------------------------------------------
create or replace function public.project_enqueue_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  begin
    perform public.enqueue_webhook(
      new.workspace_id,
      'projeto.criado',
      jsonb_build_object(
        'id', new.id,
        'nome', new.name,
        'setorId', new.sector_id,
        'situacao', new.status,
        'comecaEm', new.starts_on,
        'terminaEm', new.ends_on
      )
    );
  exception when others then
    raise warning 'webhook enqueue falhou para projeto %: %', new.id, sqlerrm;
  end;
  return new;
end;
$fn$;

create trigger project_enqueue_webhook_trigger
  after insert on public.project
  for each row execute function public.project_enqueue_webhook();
