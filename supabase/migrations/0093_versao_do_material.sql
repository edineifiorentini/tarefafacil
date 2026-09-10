-- =====================================================================
-- TAFLOW — 0093_versao_do_material
-- O material de aprovação passa a ter versões, e a resposta do cliente
-- passa a dizer O QUE foi aprovado.
--
-- COMO ERA: `attachment.entregavel` é um booleano — o arquivo aparece ou
-- não no link do cliente (0083) —, e `task_approval` guarda a decisão
-- ligada ao LINK (0064). Junte os dois e a pergunta "o cliente aprovou
-- qual arte?" não tem resposta: ele aprovou a demanda num dia em que
-- alguma coisa estava publicada, e essa coisa pode ter sido substituída
-- depois.
--
-- O ciclo real é: envia, o cliente pede ajuste, você corrige, envia de
-- novo, o cliente aprova. Sem versão, a v02 substituía a v01 no lugar, e o
-- "aprovado" da v01 continuava lá, agora apontando para um arquivo que
-- ninguém aprovou.
--
-- TRÊS DECISÕES DO DONO, em 9/set/2026:
--
-- 1. **Publicar vira ato explícito.** O arquivo enviado nasce RASCUNHO;
--    quem produz revisa, escreve a mensagem e só então publica. Marcar e
--    pronto era um passo a menos e um acidente a mais.
--
-- 2. **O que já existe vira v01 publicada.** Nenhum link muda de
--    comportamento e ninguém perde arquivo.
--
-- 3. **A aprovação NÃO migra de versão.** Aprovou a v01, o registro fica
--    na v01. Subiu a v02, a demanda volta a aguardar — que é o correto e é
--    diferente do que acontecia.
--
-- O QUE NÃO PODE QUEBRAR: link que já está no WhatsApp de alguém. A função
-- pública continua aceitando a chamada de quatro argumentos, sem versão,
-- exatamente como a página antiga a chama.
-- =====================================================================

-- ------------------------------------------------------------- versões
--
-- `material_id` agrupa as versões de uma mesma peça. A primeira aponta
-- para si mesma — assim não existe linha órfã nem tabela nova só para
-- guardar um id.
alter table public.attachment
  add column material_id uuid,
  add column versao integer not null default 1,
  add column publicado_em timestamptz,
  add column mensagem_ao_cliente text;

comment on column public.attachment.material_id is
  'Agrupa as versões de uma mesma peça (0093). A v01 aponta para si mesma.';
comment on column public.attachment.versao is
  'Número da versão dentro do material. Imutável: subir arte nova cria linha nova, nunca reescreve a anterior.';
comment on column public.attachment.publicado_em is
  'Quando esta versão foi liberada para o cliente. Nulo = rascunho, visível só por dentro (0093).';
comment on column public.attachment.mensagem_ao_cliente is
  'O recado que acompanha esta versão no link público.';

-- O que já existe é v01 de si mesmo. E o que já estava marcado como
-- entregável JÁ ESTÁ publicado — dizer que virou rascunho tiraria do ar
-- arte que o cliente está olhando agora.
update public.attachment
   set material_id = id,
       publicado_em = case when entregavel then created_at else null end;

alter table public.attachment
  alter column material_id set not null;

alter table public.attachment
  add constraint attachment_material_fk
  foreign key (material_id) references public.attachment(id) on delete cascade;

-- Uma versão por número dentro de um material. É esta restrição que impede
-- dois envios simultâneos de nascerem ambos como "v02".
create unique index attachment_versao_idx
  on public.attachment (material_id, versao);

create index attachment_material_idx
  on public.attachment (material_id);

-- ------------------------------------------------- a resposta e a versão
alter table public.task_approval
  add column attachment_id uuid references public.attachment(id) on delete set null;

comment on column public.task_approval.attachment_id is
  'A VERSÃO que o cliente analisou (0093). Nula nas respostas anteriores a esta migration e nas que chegam por link antigo — o histórico não é reescrito com um palpite.';

create index task_approval_attachment_idx
  on public.task_approval (attachment_id)
  where attachment_id is not null;

-- ---------------------------------------------------------- publicar
--
-- **Sem `security definer`.** A RLS de `attachment` (0011) já responde por
-- membro, e esta função só precisa do que o chamador pode fazer. Definer
-- aqui obrigaria a repetir a autorização no corpo — a armadilha da 0087.
--
-- Publicar uma versão TIRA DO AR as anteriores do mesmo material: o cliente
-- vê a peça atual, não uma pilha. As linhas continuam todas lá; o que muda
-- é qual delas o link mostra.
create or replace function public.publicar_material(
  p_attachment uuid,
  p_mensagem   text default null
)
returns boolean
language plpgsql
set search_path = public
as $fn$
declare
  v_material uuid;
begin
  select material_id into v_material
  from public.attachment
  where id = p_attachment;

  -- Sem linha visível para quem chamou: ou não existe, ou é de outra
  -- empresa e a RLS a escondeu. As duas respondem a mesma coisa.
  if v_material is null then
    return false;
  end if;

  update public.attachment
     set entregavel = false
   where material_id = v_material
     and id <> p_attachment;

  update public.attachment
     set entregavel = true,
         publicado_em = coalesce(publicado_em, now()),
         mensagem_ao_cliente = nullif(btrim(coalesce(p_mensagem, '')), '')
   where id = p_attachment;

  return true;
end;
$fn$;

comment on function public.publicar_material(uuid, text) is
  'Libera uma versão para o cliente e tira do ar as anteriores do mesmo material (0093). Nada é apagado.';

revoke all on function public.publicar_material(uuid, text) from public;
grant execute on function public.publicar_material(uuid, text) to authenticated;

-- ------------------------------------------ a aprovação aponta a versão
--
-- A assinatura ganha um argumento com padrão, e a antiga é REMOVIDA antes.
-- Deixar as duas conviverem tornaria ambígua a chamada de quatro
-- argumentos — que é exatamente a que os links já enviados fazem.
drop function if exists public.record_task_approval(text, text, text, text);

create or replace function public.record_task_approval(
  p_token   text,
  p_decision text,
  p_comment text default null,
  p_author  text default null,
  p_attachment_id uuid default null
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
  v_versao uuid;
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

  -- **A versão só é aceita se for DESTA demanda e estiver publicada.**
  --
  -- Id inválido não recusa a aprovação: ele vira nulo e a resposta é
  -- gravada assim mesmo, que é como as anteriores a esta migration já
  -- estão. Recusar deixaria um cliente sem conseguir aprovar por causa de
  -- um defeito nosso ou de uma peça apagada entre abrir a página e
  -- clicar — pior que um registro menos preciso.
  if p_attachment_id is not null then
    select a.id into v_versao
    from public.attachment a
    where a.id = p_attachment_id
      and a.task_id = v_task.id
      and a.publicado_em is not null;
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
    (workspace_id, task_id, share_link_id, decision, comment, author_name,
     attachment_id)
  values
    (v_link.workspace_id, v_task.id, v_link.id, p_decision,
     nullif(btrim(coalesce(p_comment, '')), ''), v_nome, v_versao);

  v_titulo := case p_decision
    when 'aprovado' then coalesce(v_nome, 'O cliente') || ' aprovou "' || v_task.title || '"'
    else coalesce(v_nome, 'O cliente') || ' pediu ajuste em "' || v_task.title || '"'
  end;

  -- Quem precisa saber, em ordem: quem responde pela demanda; sem
  -- responsável, quem mandou o link (foi quem pediu a resposta); e, em
  -- último caso, o dono do workspace.
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

comment on function public.record_task_approval(text, text, text, text, uuid) is
  'Registra a resposta do cliente pelo link público (0064) e, quando o link informa, amarra-a à versão analisada (0093). A chamada de quatro argumentos continua valendo — é a que os links já enviados fazem.';

revoke all on function public.record_task_approval(text, text, text, text, uuid) from public;
grant execute on function public.record_task_approval(text, text, text, text, uuid)
  to anon, authenticated;
