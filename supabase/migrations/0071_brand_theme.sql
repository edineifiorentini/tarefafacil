-- =====================================================================
-- TarefaFácil — 0071_brand_theme
-- Cor da marca de cada empresa.
--
-- Lista fechada, não hexadecimal livre. Com campo aberto alguém escolhe
-- amarelo e o texto de link fica ilegível sobre branco — e o sistema não
-- tem como recusar uma cor bonita que reprova no contraste. Cada valor aqui
-- corresponde a uma rampa conferida em `styles/tokens.css`.
--
-- Amarelo e vermelho ficam de fora da lista de propósito: colidem com o
-- aviso e com o atraso, e o sistema inteiro passaria a parecer alarmado.
--
-- `azul` é o padrão porque é a marca atual — quem não escolher nada não vê
-- diferença nenhuma.
-- =====================================================================

alter table public.workspace
  add column brand_theme text not null default 'azul'
    check (brand_theme in (
      'azul', 'indigo', 'lilas', 'teal', 'verde', 'magenta', 'grafite'
    ));

-- A 0059 revogou o UPDATE do cliente em `workspace` e devolveu só a coluna
-- `name` — um dono conseguia mudar os próprios assentos pelo navegador. A
-- cor entra na mesma lista curta: é escolha de quem administra a empresa, e
-- não mexe em nada que valha dinheiro.
grant update (brand_theme) on public.workspace to authenticated;

comment on column public.workspace.brand_theme is
  'Cor da marca da empresa. Lista fechada; as rampas vivem em styles/tokens.css.';
