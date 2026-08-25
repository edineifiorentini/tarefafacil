-- =====================================================================
-- TarefaFácil — 0069_avatar_bucket
-- Foto de perfil de cada pessoa.
--
-- Caminho: {user_id}/{aleatório}.jpg — a 1ª pasta é o dono, e é ela que a
-- policy usa. Cada um escreve só na própria pasta; ninguém troca a foto de
-- outro.
--
-- **Bucket público, ao contrário do `attachments` (0006).** A diferença não
-- é descuido:
--
--   - anexo é documento de trabalho do cliente — contrato, arte, planilha.
--     Vaza informação de negócio, e por isso é privado com URL assinada.
--   - avatar aparece em toda lista, todo card, todo comentário. Com bucket
--     privado, desenhar a tela do chat exigiria assinar uma URL por pessoa,
--     que expira e precisa ser reassinada. Muita máquina para uma miniatura.
--
-- O que protege aqui é o caminho ser impossível de adivinhar: além do id do
-- usuário, o nome do arquivo é aleatório. Trocar a foto gera um nome novo, e
-- a anterior é apagada — não fica um histórico de fotos antigas acessível a
-- quem guardou a URL.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Escrita: só na própria pasta.
create policy "avatars_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
