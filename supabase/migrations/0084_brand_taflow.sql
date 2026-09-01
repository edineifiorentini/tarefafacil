-- =====================================================================
-- TAFLOW — 0084_brand_taflow
-- A paleta da marca vira opção de cor, e passa a ser o padrão.
--
-- Pedido do dono em set/2026, junto com a logo: grafite #171717, acid lime
-- #C7FF38, cloud white #F5F7F2.
--
-- **O acid lime NÃO é a cor da marca no sentido que o sistema usa.**
-- Cada tema define `--brand-700`, que é o TEXTO DE LINK. Medido com a
-- `contrastRatio` do próprio projeto: lime sobre branco dá 1.18:1 — o
-- mesmo motivo pelo qual amarelo e vermelho já estavam fora da lista
-- (ver lib/branding/themes.ts).
--
-- A saída foi olhar onde o lime é seguro. O sistema já troca o degrau do
-- link entre os temas (700 no claro, 300 no escuro), então:
--
--     claro   link = grafite #171717  ->  17.93:1 sobre branco
--     escuro  link = lime    #C7FF38  ->  15.99:1 sobre #0f1117
--
-- Assim os 10% de lime da paleta aparecem de verdade, e ele nunca vira
-- texto sobre fundo claro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- O valor novo
--
-- Empresa que já existe NÃO muda de cor: `set default` só vale para linha
-- nova. Ninguém acorda com o sistema repintado.
-- ---------------------------------------------------------------------

alter table public.workspace
  drop constraint if exists workspace_brand_theme_check;

alter table public.workspace
  add constraint workspace_brand_theme_check
  check (brand_theme in (
    'taflow', 'azul', 'indigo', 'lilas', 'teal', 'verde', 'magenta', 'grafite'
  ));

alter table public.workspace
  alter column brand_theme set default 'taflow';

-- ---------------------------------------------------------------------
-- Já perguntamos?
--
-- **Coluna própria, e não inferência a partir da cor.** Sem ela, "ainda
-- está no padrão" e "escolheu o padrão de propósito" ficam idênticos — e a
-- tela de boas-vindas voltaria a perguntar para quem já respondeu.
--
-- Nula = nunca perguntamos. É o que aciona a escolha no primeiro acesso.
-- ---------------------------------------------------------------------

alter table public.workspace
  add column brand_escolhida_em timestamptz;

comment on column public.workspace.brand_escolhida_em is
  'Quando a empresa escolheu (ou pulou) a cor. Nulo = nunca perguntamos.';

-- Entra na mesma lista curta de colunas que o cliente escreve (0059, 0071,
-- 0080). É carimbo de uma escolha dele, não valor que mexa em dinheiro.
grant update (brand_escolhida_em) on public.workspace to authenticated;

-- Empresa que já usa o sistema não deve ver a tela de boas-vindas: ela já
-- tem cor, escolhida ou herdada, e perguntar agora seria ruído.
update public.workspace
   set brand_escolhida_em = now()
 where brand_escolhida_em is null;
