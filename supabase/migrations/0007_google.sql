-- =====================================================================
-- TarefaFácil — 0007_google  (E14)
-- Conexão OAuth com o Google Agenda, por workspace.
-- Os tokens ficam SÓ no servidor: RLS ativa, sem policy para `authenticated`,
-- então a chave publishable (cliente) não lê nada aqui. O servidor acessa
-- com a secret key (ignora RLS). O status da conexão é exposto por rota.
-- =====================================================================

create table public.google_connection (
  workspace_id  uuid primary key references public.workspace(id) on delete cascade,
  user_id       uuid not null,               -- quem conectou (app_user.id)
  google_email  text,
  access_token  text,
  refresh_token text not null,
  token_expiry  timestamptz,                 -- validade do access_token
  scope         text,
  status        text not null default 'active'
                  check (status in ('active', 'expired', 'revoked')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger google_connection_set_updated_at
  before update on public.google_connection
  for each row execute function public.set_updated_at();

-- RLS ativa e sem policy: bloqueia o cliente por completo. Só a secret key lê.
alter table public.google_connection enable row level security;
