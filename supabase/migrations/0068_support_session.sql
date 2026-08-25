-- =====================================================================
-- TarefaFácil — 0068_support_session
-- Registro dos acessos de suporte do admin da plataforma.
--
-- O dono pediu uma "senha master" no .env que entrasse em qualquer conta.
-- O mecanismo acabou sendo o mesmo — o servidor cria uma sessão para o
-- usuário-alvo —, mas o gatilho e o registro mudam, e é aí que mora a
-- diferença que importa:
--
--   senha master: qualquer um com o segredo entra, e a trilha do cliente
--   diz que FOI O CLIENTE quem mexeu.
--
--   acesso de suporte: só quem está em PLATFORM_ADMIN_EMAILS entra, tem
--   prazo, e fica escrito quem entrou, quando saiu e por quê.
--
-- **O cliente lê as próprias linhas.** Acesso de suporte que o cliente não
-- pode ver não é auditoria, é vigilância — e, num sistema que guarda o
-- financeiro e os dados dos clientes DELE, é problema de LGPD antes de ser
-- problema de confiança.
--
-- Ninguém escreve pelo cliente: sem policy de insert/update/delete. Quem
-- grava é a rota, com a chave secreta, depois de conferir o admin.
-- =====================================================================

create table public.support_session (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  /** Quem entrou. Texto, porque o admin da plataforma vive no .env. */
  admin_email  text not null,
  /** `set null` para a linha sobreviver à saída de quem acessou. */
  admin_user_id uuid references public.app_user(id) on delete set null,

  /** Em nome de quem a sessão foi criada (o dono do workspace). */
  impersonated_user_id uuid not null,

  /** Por que o acesso foi necessário. É o que salva a conversa depois. */
  reason       text not null,

  started_at   timestamptz not null default now(),
  /** Nulo enquanto a sessão está aberta. */
  ended_at     timestamptz,
  /** Prazo duro: passou disso, o proxy derruba mesmo sem alguém encerrar. */
  expires_at   timestamptz not null
);

create index support_session_workspace_idx
  on public.support_session (workspace_id, started_at desc);

alter table public.support_session enable row level security;

-- Transparência: o cliente vê quem entrou na conta dele e quando.
create policy support_session_select on public.support_session
  for select using (public.is_member(workspace_id));
