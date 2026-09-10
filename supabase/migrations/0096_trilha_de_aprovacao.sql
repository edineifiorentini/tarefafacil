-- =====================================================================
-- TAFLOW — 0096_trilha_de_aprovacao
-- Separa "material do cliente" de "anexo de trabalho" — que a 0093 tornou
-- impossível distinguir.
--
-- O BURACO: até aqui, a aba lia `entregavel` para dividir as duas listas —
-- marcado ia para "Aprovação", desmarcado ia para "Trabalho". A 0093 fez o
-- material NASCER RASCUNHO (decisão 1 do dono), e rascunho é
-- `entregavel = false`. Ou seja: toda peça enviada ao cliente apareceria
-- no meio do briefing e do contrato até o instante em que fosse publicada,
-- que é justamente quando ela sai de lá.
--
-- `entregavel` responde "o cliente está vendo ESTA versão agora". É uma
-- pergunta sobre a versão. A pergunta da aba é outra — "esta peça é do
-- cliente ou é nossa?" —, e ela vale para o material inteiro, incluindo a
-- v01 que já foi substituída. Duas perguntas, duas colunas.
--
-- O que existe hoje e está publicado é material do cliente; o resto é
-- trabalho interno. Ninguém vê nada mudar de lugar.
-- =====================================================================

alter table public.attachment
  add column para_aprovacao boolean not null default false;

comment on column public.attachment.para_aprovacao is
  'A peça pertence à trilha de aprovação do cliente (0096). Diferente de `entregavel`, que diz se ESTA versão é a que o cliente vê agora — uma v01 substituída continua sendo material do cliente.';

update public.attachment
   set para_aprovacao = true
 where entregavel;

-- Uma versão nova herda a trilha do material, sempre: seria absurdo a v02
-- de uma peça publicada nascer como anexo interno. O gatilho da 0095 já
-- cuida do `material_id`; este trecho cuida do resto da herança.
create or replace function public.attachment_material_padrao()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_trilha boolean;
begin
  if new.material_id is null then
    new.material_id := new.id;
    return new;
  end if;

  -- Informou o material: é versão de uma peça que já existe.
  select para_aprovacao into v_trilha
  from public.attachment
  where id = new.material_id;

  if v_trilha then
    new.para_aprovacao := true;
  end if;

  return new;
end;
$fn$;

comment on function public.attachment_material_padrao() is
  'A primeira versão de um material aponta para si mesma (0093/0095); as seguintes herdam a trilha de aprovação do material (0096).';

-- Publicar É colocar na trilha do cliente. Sem isto, publicar direto uma
-- peça que nasceu interna a deixaria visível para o cliente e escondida da
-- aba que deveria mostrá-la.
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
         para_aprovacao = true,
         publicado_em = coalesce(publicado_em, now()),
         mensagem_ao_cliente = nullif(btrim(coalesce(p_mensagem, '')), '')
   where id = p_attachment;

  -- As versões anteriores continuam sendo material do cliente. É o que
  -- sustenta o histórico "v01 substituída" na tela de quem produz.
  update public.attachment
     set para_aprovacao = true
   where material_id = v_material;

  return true;
end;
$fn$;

comment on function public.publicar_material(uuid, text) is
  'Libera uma versão para o cliente, tira do ar as anteriores do mesmo material e fixa a peça na trilha de aprovação (0093/0096). Nada é apagado.';

revoke all on function public.publicar_material(uuid, text) from public, anon;
grant execute on function public.publicar_material(uuid, text) to authenticated;

-- A aba lê por aqui: uma demanda tem poucas peças, mas a lista de anexos de
-- uma empresa inteira cresce sem parar.
create index attachment_trilha_idx
  on public.attachment (task_id)
  where para_aprovacao;
