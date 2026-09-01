-- =====================================================================
-- TAFLOW — 0083_attachment_entregavel
-- Qual anexo o cliente pode ver pelo link público.
--
-- Pedido do dono em 31/ago/2026: o cliente aprova o criativo pelo link, mas
-- o criativo não aparece lá. Ele aprova uma peça que viu por outro canal —
-- provavelmente WhatsApp, que é justamente o que a §18 do roadmap queria
-- eliminar. Aprovar sem a peça na frente é assinar em branco.
--
-- **`default false` é a decisão, não o valor conveniente.** O bucket
-- `attachments` (0006) é privado de propósito: anexo é documento de
-- trabalho e vaza informação de negócio. Publicar a pasta inteira por token
-- entregaria o contrato e a planilha de custo junto com a arte.
--
-- Escolhido entre duas opções pelo modo como cada uma FALHA. Marcando por
-- arquivo, esquecer dá "o cliente não vê a peça" — ele reclama, você marca,
-- acabou. Publicando tudo, o vazamento é silencioso e permanente.
--
-- Quem marca: quem já podia anexar (owner, admin, member — policy da 0011).
-- Exigir o dono para liberar cada arte criaria fila em cima de quem produz.
-- =====================================================================

alter table public.attachment
  add column entregavel boolean not null default false;

comment on column public.attachment.entregavel is
  'Visível ao cliente pelo link público (0083). Falso por padrão — publicar é ato explícito.';

-- Só os marcados são lidos pela rota pública, e ela filtra por task_id
-- junto. O índice parcial mantém essa leitura barata sem pesar nas
-- escritas, que são a maioria.
create index attachment_entregavel_idx
  on public.attachment (task_id)
  where entregavel;
