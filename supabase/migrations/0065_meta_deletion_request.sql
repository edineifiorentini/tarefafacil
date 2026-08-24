-- =====================================================================
-- TarefaFácil — 0065_meta_deletion_request
-- Pedido de exclusão de dados vindo da Meta.
--
-- Quando alguém remove o TarefaFácil das configurações do Facebook, a Meta
-- chama uma URL nossa avisando. Ela EXIGE esse retorno para aprovar o app,
-- e testa o endereço durante a revisão.
--
-- A tabela existe para o endpoint não ser teatro. Sem ela, a rota
-- devolveria um código de confirmação que não corresponde a nada, e a
-- página de status mentiria para quem fosse conferir. Com ela, dá para
-- responder as duas perguntas que importam: alguém pediu, e o que foi
-- feito.
--
-- Ninguém acessa pelo cliente: RLS ligada e nenhuma policy. Quem escreve é
-- a rota, com a chave secreta, depois de conferir a assinatura da Meta.
-- =====================================================================

create table public.meta_deletion_request (
  /** O código que a Meta recebe e que a pessoa usa para consultar. */
  code           text primary key,
  /** ID do usuário no Facebook. Não é o nosso `app_user`. */
  external_user_id text not null,
  requested_at   timestamptz not null default now(),
  /** Nulo enquanto não terminou. */
  completed_at   timestamptz,
  /** O que foi apagado, em texto legível para quem consultar. */
  outcome        text
);

create index meta_deletion_request_user_idx
  on public.meta_deletion_request (external_user_id);

alter table public.meta_deletion_request enable row level security;
