-- =====================================================================
-- TAFLOW — 0099_reprogramar_prazo
-- O prazo de uma demanda muda com motivo, e o primeiro prazo fica guardado.
--
-- Aprovado pelo dono em 11/set/2026, a partir de um protótipo. O caso que
-- originou: o crachá do Conselho Tutelar atrasou, o cliente pediu mudanças
-- pelo WhatsApp, e o prazo ficou desatualizado. Editar a data resolvia a
-- tela e apagava a história — e o relatório passava a contar a entrega
-- atrasada como pontual.
--
-- TRÊS PEÇAS:
--
-- 1. `task.prazo_original` — o PRIMEIRO prazo definido, e ele nunca muda.
--    Um gatilho o preenche e o trava; nem o aplicativo nem a API conseguem
--    reescrevê-lo. É o que sustenta "pontualidade no prazo original".
--
-- 2. O motivo viaja até o histórico que já existe (`task_activity`, 0025),
--    em vez de uma tabela nova: toda mudança de prazo já era registrada ali,
--    faltava o porquê. `reprogramar_prazo` guarda o motivo numa configuração
--    da transação e troca a data; o gatilho de histórico lê o motivo e grava
--    tudo junto. Sem transação, não há como o motivo se separar da mudança.
--
-- 3. `task.prazo_motivo` — o último motivo, repetido na própria demanda.
--    É o que deixa a Lista mostrar "original 9 set · aguardando o cliente"
--    sem uma consulta de histórico por linha.
--
-- NENHUMA MUDANÇA FICA SEM REGISTRO, MAS O BANCO NÃO BLOQUEIA. A sincronia
-- do Google aplica a data no servidor e não tem a quem perguntar; bloquear
-- quebraria a sincronia. Por isso o gatilho classifica: veio do Google é
-- "google_agenda", desfez uma mudança do Google é "google_desfeito", e
-- qualquer outro caminho sem motivo fica "nao_informado" — visível no
-- relatório, em vez de invisível. Quem pede o motivo é a interface (regra
-- no CLAUDE.md).
--
-- A lista de motivos daqui espelha `lib/tarefas/reprogramacao.ts`; o teste
-- do catálogo lê este arquivo e falha se as duas divergirem.
-- =====================================================================

-- ------------------------------------------------------------ colunas
alter table public.task
  add column prazo_original date,
  add column prazo_motivo text;

alter table public.task_activity
  add column motivo text,
  add column observacao text;

-- Os motivos que existem. Os cinco primeiros são escolha de quem reprograma;
-- os três últimos só o gatilho grava.
create or replace function public.motivo_de_prazo_valido(p_motivo text)
returns boolean
language sql
immutable
set search_path = public
as $fn$
  select p_motivo is null or p_motivo = any (array[
    'cliente_pediu_mudanca', 'aguardando_cliente', 'mudanca_escopo',
    'imprevisto_equipe', 'outro',
    'google_agenda', 'google_desfeito', 'nao_informado'
  ]::text[]);
$fn$;

alter table public.task
  add constraint task_prazo_motivo_valido check (public.motivo_de_prazo_valido(prazo_motivo));
alter table public.task_activity
  add constraint task_activity_motivo_valido check (public.motivo_de_prazo_valido(motivo));

comment on column public.task.prazo_original is
  'O primeiro prazo definido (0099). Preenchido e travado por gatilho: nunca muda, nem com reprogramações. Base da pontualidade no prazo original.';
comment on column public.task.prazo_motivo is
  'O motivo da última reprogramação (0099), repetido aqui para a Lista não consultar o histórico linha a linha.';
comment on column public.task_activity.motivo is
  'Por que o prazo mudou (0099). Só em linhas de due_date. Nulo nas mudanças anteriores a esta migration.';

-- --------------------------------------------- de onde veio o motivo
--
-- Uma função só decide, e os dois gatilhos a usam: o que grava na demanda e
-- o que grava no histórico não podem discordar sobre o motivo.
create or replace function public.motivo_da_mudanca_de_prazo(p_old public.task, p_new public.task)
returns text
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_informado text := nullif(current_setting('taflow.prazo_motivo', true), '');
begin
  if v_informado is not null then
    return v_informado;
  end if;
  -- `lib/gcal/pull.ts` carimba a edição externa na mesma escrita da data.
  if p_new.gcal_external_edit_at is not null
     and p_new.gcal_external_edit_at is distinct from p_old.gcal_external_edit_at then
    return 'google_agenda';
  end if;
  -- `app/api/gcal/undo` limpa o carimbo ao devolver a data anterior.
  if p_old.gcal_external_edit_at is not null and p_new.gcal_external_edit_at is null then
    return 'google_desfeito';
  end if;
  return 'nao_informado';
end;
$fn$;

-- ------------------------------------------- prazo original e último motivo
create or replace function public.task_prazo_original()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  -- Ninguém escreve o original nem o motivo à mão: o que um insert ou um
  -- update trouxer nessas duas colunas é ignorado. Sem isso a trava seria
  -- só da interface, e a pontualidade no prazo original valeria o que
  -- alguém quisesse gravar pela API.
  if tg_op = 'INSERT' then
    -- O prazo com que a demanda nasce é o primeiro. Motivo não há: nada
    -- foi reprogramado ainda.
    new.prazo_original := new.due_date;
    new.prazo_motivo := null;
    return new;
  end if;

  -- Travado: uma vez definido, o original é o que era. Antes disso, é o
  -- primeiro prazo que a demanda tiver.
  new.prazo_original := coalesce(old.prazo_original, old.due_date, new.due_date);

  -- Mudou um prazo que JÁ EXISTIA: isso é reprogramar, e tem motivo.
  if old.due_date is not null and new.due_date is distinct from old.due_date then
    new.prazo_motivo := public.motivo_da_mudanca_de_prazo(old, new);
  else
    new.prazo_motivo := old.prazo_motivo;
  end if;
  return new;
end;
$fn$;

create trigger task_prazo_original_trigger
  before insert or update on public.task
  for each row execute function public.task_prazo_original();

-- ------------------------------------------------ histórico com motivo
--
-- Igual à 0025 em tudo, menos na linha de `due_date`, que agora leva o
-- motivo e a observação. `create or replace` mantém o gatilho existente
-- ligado a esta função.
create or replace function public.task_log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if new.completed_at is distinct from old.completed_at then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'completed_at', old.completed_at::text, new.completed_at::text);
  end if;
  if new.cancelled_at is distinct from old.cancelled_at then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'cancelled_at', old.cancelled_at::text, new.cancelled_at::text);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_activity
      (workspace_id, task_id, changed_by, field, old_value, new_value, motivo, observacao)
    values (
      new.workspace_id, new.id, v_actor, 'due_date', old.due_date::text, new.due_date::text,
      -- Definir o primeiro prazo não é reprogramar: sem motivo.
      case when old.due_date is null then null
           else public.motivo_da_mudanca_de_prazo(old, new) end,
      case when old.due_date is null then null
           else nullif(btrim(coalesce(current_setting('taflow.prazo_observacao', true), '')), '') end
    );
  end if;
  if new.priority is distinct from old.priority then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'priority', old.priority, new.priority);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'assignee_id', old.assignee_id::text, new.assignee_id::text);
  end if;
  if new.column_id is distinct from old.column_id then
    insert into public.task_activity (workspace_id, task_id, changed_by, field, old_value, new_value)
    values (new.workspace_id, new.id, v_actor, 'column_id', old.column_id::text, new.column_id::text);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------- reprogramar
--
-- **Sem `security definer`.** A RLS de `task` já responde por membro com
-- escrita (0011); esta função só faz o que o chamador poderia fazer — a
-- lição da 0087.
--
-- Recusa, devolvendo `false`: motivo fora dos cinco de escolha, demanda sem
-- prazo (o primeiro prazo não é reprogramação) e data igual à atual.
-- `p_prazo` nulo é tirar o prazo — também com motivo, porque tirar o prazo
-- de uma demanda atrasada é o jeito mais rápido de esconder o atraso.
create or replace function public.reprogramar_prazo(
  p_task       uuid,
  p_prazo      date,
  p_motivo     text,
  p_observacao text default null
)
returns boolean
language plpgsql
set search_path = public
as $fn$
declare
  v_atual date;
begin
  if p_motivo is null or p_motivo <> all (array[
    'cliente_pediu_mudanca', 'aguardando_cliente', 'mudanca_escopo',
    'imprevisto_equipe', 'outro'
  ]::text[]) then
    return false;
  end if;

  select due_date into v_atual from public.task where id = p_task;
  if not found or v_atual is null or v_atual is not distinct from p_prazo then
    return false;
  end if;

  -- `true` = só nesta transação. A chamada seguinte não herda o motivo.
  perform set_config('taflow.prazo_motivo', p_motivo, true);
  perform set_config('taflow.prazo_observacao', coalesce(p_observacao, ''), true);

  update public.task set due_date = p_prazo where id = p_task;
  return found;
end;
$fn$;

comment on function public.reprogramar_prazo(uuid, date, text, text) is
  'Muda um prazo existente com motivo (0099). O gatilho de histórico grava a mudança com o motivo e a observação na mesma transação.';

-- A lição da 0094: `revoke from public` não tira o grant padrão de `anon`.
revoke all on function public.reprogramar_prazo(uuid, date, text, text) from public, anon;
grant execute on function public.reprogramar_prazo(uuid, date, text, text) to authenticated;

-- ------------------------------------------------------------ relatório
--
-- "Reprogramações por motivo" soma as linhas de prazo com motivo de uma
-- empresa num período. O índice é parcial: só essas linhas entram, e o
-- histórico inteiro — uma linha por movimentação desde a 0025 — fica fora.
create index task_activity_reprogramacao_idx
  on public.task_activity (workspace_id, created_at)
  where field = 'due_date' and motivo is not null;

-- ------------------------------------------------------------- backfill
--
-- O prazo original das demandas que já existem é o mais antigo que o
-- histórico conhece: o valor ANTERIOR à primeira mudança registrada, ou,
-- se a primeira mudança partiu de "sem prazo", o que ela definiu. Sem
-- histórico, o prazo atual.
--
-- Limite honesto: mudanças anteriores à 0025 não foram registradas, então
-- para demandas muito antigas o "original" pode já ser uma reprogramação.
-- É o melhor que os dados permitem, e é melhor que tratar todo prazo atual
-- como original.
-- **Sem disparar os gatilhos da demanda.** Este update toca de uma vez toda
-- demanda com prazo: com os gatilhos ligados, o "atualizado em" de cada uma
-- viraria agora
-- (a página do cliente mostra essa data) e cada uma geraria uma entrega de
-- webhook. `disable trigger user` desliga só os gatilhos do projeto — as
-- chaves estrangeiras continuam valendo — e só dentro desta migration.
alter table public.task disable trigger user;

update public.task t
   set prazo_original = coalesce(
     (
       select coalesce(a.old_value, a.new_value)::date
         from public.task_activity a
        where a.task_id = t.id
          and a.field = 'due_date'
          and coalesce(a.old_value, a.new_value) is not null
        order by a.created_at asc
        limit 1
     ),
     t.due_date
   )
 where t.prazo_original is null
   -- Só as que têm o que guardar: demanda sem prazo e sem histórico de prazo
   -- ficaria nula de qualquer jeito, e reescrevê-la seria escrita à toa.
   and (
     t.due_date is not null
     or exists (
       select 1
         from public.task_activity a
        where a.task_id = t.id
          and a.field = 'due_date'
     )
   );

alter table public.task enable trigger user;
