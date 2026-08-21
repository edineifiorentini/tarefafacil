-- =====================================================================
-- TarefaFácil — 0059_workspace_column_grants
-- O dono do workspace podia vender para si mesmo.
--
-- A policy da 0011 diz `for update using (has_role(id, owner/admin))`, e
-- RLS é por LINHA, não por coluna. Com isso, qualquer dono conseguia, do
-- próprio navegador e com a chave publishable:
--
--   update workspace set seat_limit = 999            -- assentos de graça
--   update workspace set access_expires_at = '2099'  -- assinatura eterna
--   update workspace set suspended = false           -- desbloqueio próprio
--
-- Verificado contra o banco antes desta correção: as três passaram. Ou
-- seja, o controle de "venda por período" — que a 0017 usa em `has_role`
-- para barrar escrita de workspace vencido — era autoatendimento. E um
-- período de teste não vale nada se quem testa consegue estendê-lo.
--
-- A correção é grant por COLUNA, que é o que o Postgres tem para isso. RLS
-- continua valendo (quem não é dono nem chega aqui); o grant limita QUAIS
-- colunas um dono pode tocar.
--
-- Hoje o app não atualiza esta tabela pelo cliente em lugar nenhum — o
-- único caminho de escrita é a RPC `create_workspace`, que é security
-- definer. `name` fica liberado porque renomear o próprio workspace é
-- legítimo e é o que alguém vai querer primeiro. Todo o resto — plano,
-- assentos, vencimento, bloqueio, indicação, contato de cobrança — só pelo
-- servidor: painel da plataforma ou rota que confere quem está pedindo.
-- =====================================================================

revoke update on table public.workspace from authenticated;
revoke update on table public.workspace from anon;

grant update (name) on table public.workspace to authenticated;
