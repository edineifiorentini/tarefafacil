-- =====================================================================
-- TarefaFácil — 0046_share_link
-- Link público revogável (spec §11): o cliente acompanha uma demanda sem
-- virar membro do workspace.
--
-- Regras que o spec impõe e que estão codificadas aqui:
--
--  - REVOGÁVEL: `revoked_at`. Revogar não apaga a linha — saber que existiu
--    um link e quando foi cortado é parte da auditoria.
--  - EXPIRA: `expires_at` é NOT NULL. Não existe link eterno; link eterno é
--    vazamento adiado. O padrão é 30 dias.
--  - NUNCA EXPÕE ALÉM DO AUTORIZADO: esta tabela não concede leitura de
--    nada. Quem monta a resposta pública é o servidor, escolhendo campo a
--    campo. Ver `lib/share/publicTask.ts`.
--
-- O token não se adivinha: 64 caracteres hexadecimais de origem aleatória.
-- =====================================================================

create table public.share_link (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  entity_type  text not null check (entity_type in ('task')),
  entity_id    uuid not null,

  -- Dois UUIDv4 concatenados, sem hífen: 64 caracteres hexadecimais, ~244
  -- bits de aleatoriedade. Usa só gen_random_uuid(), que é do núcleo do
  -- Postgres — o pgcrypto do 0012 mudou de schema no Supabase e o
  -- gen_random_bytes deixou de ser alcançável.
  token        text not null unique
                 default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),

  -- Rótulo para quem administra saber para quem foi ("Prefeitura", "Cliente
  -- João"). Nunca aparece na página pública.
  label        text,

  expires_at   timestamptz not null default (now() + interval '30 days'),
  revoked_at   timestamptz,

  -- Prestação de contas: dá para responder "o cliente chegou a abrir?".
  view_count     integer not null default 0,
  last_viewed_at timestamptz,

  created_by   uuid references public.app_user(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index share_link_entity_idx
  on public.share_link (workspace_id, entity_type, entity_id);

alter table public.share_link enable row level security;

-- Quem trabalha na demanda cria e revoga o link dela. Leitor não —
-- compartilhar para fora é decisão de quem responde pelo trabalho.
create policy share_link_manage on public.share_link
  for all using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));

-- ---------------------------------------------------------------------
-- Contador de visitas.
--
-- É função porque a página pública roda sem usuário: a RLS acima exigiria
-- um membro autenticado, e o visitante não é. Fica security definer e faz
-- UMA coisa só — somar uma visita a um link válido. Não devolve nada do
-- conteúdo, então não vira porta de leitura.
-- ---------------------------------------------------------------------
create or replace function public.register_share_view(p_token text)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.share_link
  set view_count = view_count + 1,
      last_viewed_at = now()
  where token = p_token
    and revoked_at is null
    and expires_at > now();
$fn$;

revoke all on function public.register_share_view(text) from public;
grant execute on function public.register_share_view(text) to anon, authenticated;
