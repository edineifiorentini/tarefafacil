-- =====================================================================
-- TAFLOW — 0100_listagem_dos_buckets
-- Anônimo não LISTA mais os arquivos dos buckets públicos.
--
-- Encontrado na auditoria de segurança de 11/set/2026, sondando a produção
-- com a chave publishable (a que roda no navegador de qualquer visitante):
-- `POST /storage/v1/object/list/avatars` respondia 200 com os arquivos.
--
-- O QUE ISSO ENTREGAVA. A primeira pasta de cada caminho é um identificador:
-- em `avatars` é o id do usuário, em `logos` é o id da empresa. Listar o
-- bucket devolve, portanto, a lista de quem tem conta e de quais empresas
-- existem — de graça, sem login. Não é o conteúdo do sistema, mas é o mapa
-- dele, e mapa é o que se usa para escolher alvo.
--
-- POR QUE ACONTECIA. A 0070 (avatares) e a 0080 (logos) criaram a policy de
-- SELECT sem cláusula `to`, e policy sem `to` vale para TODOS os papéis,
-- `anon` inclusive. A intenção das duas era outra, e está escrita lá: o
-- dono precisa enxergar a própria linha em `storage.objects` para o
-- `remove()` funcionar na hora de trocar a foto ou a logo — senão a
-- anterior fica no bucket, acessível a quem guardou a URL.
--
-- A CORREÇÃO mantém essa intenção e tira o resto: SELECT só para
-- `authenticated`, e só sobre o que a pessoa já podia escrever — a própria
-- pasta, no avatar; a empresa que ela administra, na logo. São as mesmas
-- condições das policies de insert/update/delete que já existiam ao lado.
--
-- **A EXIBIÇÃO DAS IMAGENS NÃO MUDA, e este é o ponto que torna a correção
-- segura.** Bucket público entrega os bytes por
-- `/storage/v1/object/public/<bucket>/<caminho>`, que não consulta policy
-- nenhuma. Avatar em lista, em card e em comentário, e a logo no cabeçalho
-- e no link do cliente, continuam carregando para quem não está logado —
-- que é exatamente por que estes dois buckets são públicos (0069).
--
-- A varredura de anexos (`/api/cron/limpar-anexos`) lista pelo cliente
-- administrativo, que ignora RLS: nada lá depende destas policies.
-- =====================================================================

-- ------------------------------------------------------------- avatares
drop policy if exists "avatars_select" on storage.objects;

create policy "avatars_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------- logos
drop policy if exists "logos_select" on storage.objects;

create policy "logos_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'logos' and public.pode_gerir_logo(name));
