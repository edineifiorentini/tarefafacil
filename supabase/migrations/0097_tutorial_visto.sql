-- =====================================================================
-- TAFLOW — 0097_tutorial_visto
-- O tutorial abre sozinho na primeira vez, e só na primeira.
--
-- **Por que coluna e não `localStorage`.** O tutorial é sobre a pessoa, não
-- sobre o aparelho: quem já entendeu o produto no computador não precisa
-- ver tudo de novo ao abrir no celular. `localStorage` responderia "ainda
-- não viu" em cada navegador novo, e essa é a diferença entre um convite e
-- um incômodo.
--
-- **Fechar também carimba** — é a mesma decisão da 0084 em `EscolherMarca`:
-- "não quero agora" é uma resposta, e não um adiamento que reaparece
-- amanhã. Quem quiser rever clica no botão ao lado da busca, que fica lá
-- para sempre.
--
-- Quem já usa o sistema recebe o carimbo no backfill: seria constrangedor
-- abrir um tutorial de boas-vindas para quem está no produto há meses.
-- =====================================================================

alter table public.app_user
  add column tutorial_visto_em timestamptz;

comment on column public.app_user.tutorial_visto_em is
  'Quando a pessoa viu (ou fechou) o tutorial de boas-vindas (0097). Nulo = nunca abriu, e é o único gatilho da abertura automática.';

-- Ninguém que já está dentro acorda com uma tela de boas-vindas.
update public.app_user
   set tutorial_visto_em = now()
 where onboarding_completed_at is not null;
