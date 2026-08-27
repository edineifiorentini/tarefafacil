-- =====================================================================
-- 0077 — A inscrição declara a qual integração pertence
--
-- Decisão do dono em 27/ago/2026: o eco de uma ação sai para os outros
-- assinantes, mas NÃO volta para quem a causou.
--
-- Para cumprir isso é preciso saber que "a inscrição E pertence à integração
-- que usa a chave K". Essa ligação não se deduz: a inscrição é cadastrada
-- por uma pessoa na tela, e a chave é usada por um programa. Alguém precisa
-- dizer que as duas são a mesma integração — e quem sabe é o dono.
--
-- Nulo é o caso comum e significa "me mande tudo, inclusive o que eu causei":
-- uma inscrição que só escuta, sem chave própria, não tem eco para evitar.
-- =====================================================================

alter table public.webhook_endpoint
  add column if not exists api_key_id uuid
    references public.api_key(id) on delete set null;

comment on column public.webhook_endpoint.api_key_id is
  'Integração dona desta inscrição (0077). Quando preenchida, o que esta '
  'chave causar NÃO é entregue aqui — o eco não volta para a origem. Nulo = '
  'recebe tudo.';

create index if not exists webhook_endpoint_origem_idx
  on public.webhook_endpoint (workspace_id, api_key_id)
  where api_key_id is not null;
