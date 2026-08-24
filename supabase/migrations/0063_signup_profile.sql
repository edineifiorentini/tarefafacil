-- =====================================================================
-- TarefaFácil — 0063_signup_profile
-- Cadastro com senha: onde os dados do formulário vão parar.
--
-- Nada de tabela nova para "dados do cadastro": `workspace_profile` já
-- guarda razão social, documento e representante — é a identidade que sai
-- nos contratos. O formulário preenche ELA. Um terceiro lugar para o mesmo
-- CNPJ é como as três respostas diferentes começam.
--
-- Três acréscimos:
--
-- 1. `document_type`. A coluna `document` nasceu como "CNPJ"; agora ela
--    guarda CPF quando o cadastro é de pessoa física, e nada pode ficar
--    adivinhando pelo número de dígitos.
--
-- 2. `terms_acceptance`. Qual VERSÃO a pessoa aceitou, e quando. Guardar só
--    um booleano "aceitou" é inútil no dia em que o texto muda: ninguém
--    sabe o que foi aceito. A linha é imutável — sem policy de update nem
--    de delete, pelo mesmo motivo da trilha de auditoria.
--
-- 3. `app_user.onboarding_completed_at`. Quem entra pelo Google nunca passa
--    pelo formulário, então precisa preencher depois. Este carimbo é o que
--    o porteiro consulta. **Todo mundo que já existe recebe `now()` no
--    backfill**: gente que já usa o sistema não pode acordar amanhã presa
--    numa tela de cadastro.
-- =====================================================================

alter table public.workspace_profile
  add column document_type text
    check (document_type is null or document_type in ('pf', 'pj'));

create table public.terms_acceptance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_user(id) on delete cascade,
  /** Ex.: "2026-08-21". Muda quando o texto muda. */
  version     text not null,
  accepted_at timestamptz not null default now()
);

-- Uma aceitação por versão. Reaceitar a mesma versão não gera linha nova.
create unique index terms_acceptance_user_version_idx
  on public.terms_acceptance (user_id, version);

alter table public.terms_acceptance enable row level security;

-- Cada um vê e grava o próprio aceite. Sem update nem delete: aceite que se
-- edita não prova nada.
create policy terms_acceptance_select on public.terms_acceptance
  for select using (user_id = auth.uid());
create policy terms_acceptance_insert on public.terms_acceptance
  for insert with check (user_id = auth.uid());

alter table public.app_user
  add column onboarding_completed_at timestamptz;

-- Ninguém que já usa o sistema vai parar na tela de completar cadastro.
update public.app_user set onboarding_completed_at = now();
