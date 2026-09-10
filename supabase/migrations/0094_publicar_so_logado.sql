-- =====================================================================
-- TAFLOW — 0094_publicar_so_logado
-- Fecha `publicar_material` para quem não está logado.
--
-- A 0093 revogou de `public` e concedeu a `authenticated`, e isso NÃO
-- bastou: o Supabase concede execução a `anon` por privilégio padrão do
-- schema, e um `revoke from public` não desfaz um grant explícito. Medido
-- contra produção logo depois de aplicar: a chave anônima chamava a função
-- e recebia `false` — executou, não foi barrada.
--
-- **O efeito era zero, e mesmo assim isto é para consertar.** A função é
-- `security invoker`, então a RLS de `attachment` esconde tudo de quem não
-- é membro e as duas atualizações não pegam linha nenhuma. Só que "a RLS
-- salva" é exatamente o raciocínio que falha no dia em que alguém precisar
-- transformá-la em `security definer` por outro motivo — e aí o portão
-- aberto já estará lá, com um teste dizendo que sempre funcionou.
--
-- É a mesma lição da 0087, do outro lado: lá o problema foi definer sem
-- checagem; aqui é grant que se acreditou ter tirado.
-- =====================================================================

revoke all on function public.publicar_material(uuid, text) from anon;

-- Repetidos por clareza: quem lê isto depois precisa ver o estado final
-- inteiro, não a diferença.
revoke all on function public.publicar_material(uuid, text) from public;
grant execute on function public.publicar_material(uuid, text) to authenticated;
