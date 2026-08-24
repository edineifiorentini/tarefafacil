-- =====================================================================
-- TarefaFácil — 0066_drop_meta_deletion
-- Desfaz a 0065: a integração com a Meta foi adiada.
--
-- A 0065 criou `meta_deletion_request` para o retorno de exclusão de dados
-- que a Meta exige na revisão do app. Horas depois, o dono decidiu adiar a
-- integração inteira até a empresa estar formalizada — sem CNPJ não há
-- verificação de negócio, e sem ela o app não sai do modo de
-- desenvolvimento.
--
-- A tabela sai junto com o código que a usava. Tabela vazia, com RLS
-- ligada e nenhuma linha de código apontando para ela, é o tipo de coisa
-- que daqui a seis meses ninguém sabe se pode apagar — e por isso ninguém
-- apaga. O que precisa sobreviver é a DECISÃO, e essa está no roadmap.
--
-- Quando a integração voltar, a 0065 está no histórico do git e serve de
-- ponto de partida.
-- =====================================================================

drop table if exists public.meta_deletion_request;
