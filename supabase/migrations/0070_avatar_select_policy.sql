-- =====================================================================
-- TarefaFácil — 0070_avatar_select_policy
-- Corrige a 0069: faltava a policy de SELECT em storage.objects.
--
-- A 0069 criou insert/update/delete para o bucket `avatars` e parou aí,
-- porque o bucket é público e a leitura pela URL não passa por policy.
--
-- Só que as OPERAÇÕES DE API passam. `remove()` e `list()` precisam
-- enxergar a linha em `storage.objects` antes de agir. Sem SELECT, o
-- `remove()` não encontra nada, apaga zero linhas e **não devolve erro** —
-- o cliente acha que apagou.
--
-- O efeito era invisível e ia se acumulando: trocar a foto deixava a
-- anterior no bucket, e "Remover" limpava o `avatar_url` mas mantinha a
-- imagem acessível para quem tivesse guardado a URL. Numa tela de foto de
-- rosto, isso é o oposto do que "remover" promete.
--
-- Pego ao conferir a pasta depois de um teste de ponta a ponta: o perfil
-- estava nulo e o arquivo continuava lá.
-- =====================================================================

-- Leitura liberada, no mesmo nível do bucket (público). Não afeta os outros
-- buckets: a condição prende ao `avatars`.
create policy "avatars_select"
  on storage.objects for select
  using (bucket_id = 'avatars');
