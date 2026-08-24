-- =====================================================================
-- TarefaFácil — 0064_task_approval
-- O cliente aprova (ou pede ajuste) pelo link público.
--
-- Era o elo que faltava: o link da 0046 mostra a demanda e conta quantas
-- vezes foi aberto, mas quem abre não tem como responder. Sem isso,
-- "depois de aprovado" não tem gatilho nenhum — a aprovação acontece no
-- WhatsApp e some.
--
-- Quatro decisões:
--
-- 1. É HISTÓRICO, NÃO ESTADO. O ciclo real é: envia, cliente pede ajuste,
--    você corrige, envia de novo, cliente aprova. Guardar só "aprovado
--    sim/não" apagaria o pedido de ajuste — que é justamente o que explica
--    por que a peça mudou. O estado atual é a última linha.
--
-- 2. QUEM ESCREVE É A FUNÇÃO, NÃO O VISITANTE. A página pública roda sem
--    usuário; dar policy de insert para `anon` abriria a tabela para
--    qualquer um. A função é security definer, valida o token e faz uma
--    coisa só — mesmo desenho do `register_share_view` da 0046.
--
-- 3. O AUTOR É O QUE ELE DIGITAR. Quem abre o link é anônimo por
--    definição. Pedir o nome é cortesia para quem lê depois, não
--    identificação: ninguém deve tratar esse campo como prova de quem foi.
--
-- 4. REPETIÇÃO IMEDIATA NÃO VIRA LINHA NOVA. Clique duplo e recarregar a
--    página não podem encher o histórico. A mesma decisão, do mesmo link,
--    dentro de um minuto, é ignorada em silêncio.
-- =====================================================================

create table public.task_approval (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspace(id) on delete cascade,
  task_id       uuid not null references public.task(id) on delete cascade,
  -- Por qual link veio. `set null` para a resposta sobreviver à revogação
  -- do link: revogar não apaga o que o cliente já respondeu.
  share_link_id uuid references public.share_link(id) on delete set null,

  decision      text not null check (decision in ('aprovado', 'ajuste')),
  comment       text check (comment is null or char_length(comment) <= 2000),
  /** O nome que a pessoa digitou. Não é identificação — ver decisão 3. */
  author_name   text check (author_name is null or char_length(author_name) <= 120),

  created_at    timestamptz not null default now()
);

create index task_approval_task_idx
  on public.task_approval (workspace_id, task_id, created_at desc);

alter table public.task_approval enable row level security;

-- Leitura por quem é do workspace. Nenhuma policy de escrita: quem grava é
-- a função abaixo.
create policy task_approval_select on public.task_approval
  for select using (public.is_member(workspace_id));

-- Aprovação é resposta do cliente, não rascunho: não se edita. Apagar
-- também não — some junto com a demanda, por cascade, e só.

-- ---------------------------------------------------------------------
-- Notificação: a decisão precisa chegar em quem faz o trabalho.
-- ---------------------------------------------------------------------
alter table public.notification
  drop constraint notification_kind_check;
alter table public.notification
  add constraint notification_kind_check
  check (kind in ('mencao', 'atribuicao', 'comentario', 'aprovacao'));

alter table public.notification_preference
  add column aprovacao boolean not null default true;

-- ---------------------------------------------------------------------
-- A resposta do cliente.
-- ---------------------------------------------------------------------
create or replace function public.record_task_approval(
  p_token   text,
  p_decision text,
  p_comment text default null,
  p_author  text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_link  public.share_link;
  v_task  public.task;
  v_nome  text;
  v_titulo text;
  v_destino uuid;
begin
  if p_decision not in ('aprovado', 'ajuste') then
    return false;
  end if;

  select * into v_link
  from public.share_link
  where token = p_token
    and entity_type = 'task'
    and revoked_at is null
    and expires_at > now();

  if not found then
    return false;
  end if;

  select * into v_task from public.task where id = v_link.entity_id;
  if not found then
    return false;
  end if;

  -- Clique duplo e recarregar não enchem o histórico.
  if exists (
    select 1 from public.task_approval a
    where a.share_link_id = v_link.id
      and a.decision = p_decision
      and a.created_at > now() - interval '1 minute'
  ) then
    return true;
  end if;

  v_nome := nullif(btrim(coalesce(p_author, '')), '');

  insert into public.task_approval
    (workspace_id, task_id, share_link_id, decision, comment, author_name)
  values
    (v_link.workspace_id, v_task.id, v_link.id, p_decision,
     nullif(btrim(coalesce(p_comment, '')), ''), v_nome);

  v_titulo := case p_decision
    when 'aprovado' then coalesce(v_nome, 'O cliente') || ' aprovou "' || v_task.title || '"'
    else coalesce(v_nome, 'O cliente') || ' pediu ajuste em "' || v_task.title || '"'
  end;

  -- Quem precisa saber, em ordem: quem responde pela demanda; sem
  -- responsável, quem mandou o link (foi quem pediu a resposta); e, em
  -- último caso, o dono do workspace. `task` não tem autor, então a cadeia
  -- para no dono — resposta de cliente que não chega em ninguém é pior do
  -- que não ter aprovação.
  v_destino := coalesce(
    v_task.assignee_id,
    v_link.created_by,
    (select owner_user_id from public.workspace where id = v_task.workspace_id)
  );

  if v_destino is not null then
    insert into public.notification
      (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
    values
      (v_task.workspace_id, v_destino, 'aprovacao', 'task', v_task.id, null,
       v_titulo, nullif(btrim(coalesce(p_comment, '')), ''));
  end if;

  return true;
end;
$fn$;

revoke all on function public.record_task_approval(text, text, text, text) from public;
grant execute on function public.record_task_approval(text, text, text, text)
  to anon, authenticated;
