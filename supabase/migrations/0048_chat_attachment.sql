-- =====================================================================
-- TarefaFácil — 0048_chat_attachment
-- Arquivo na mensagem do chat (rodada 4).
--
-- Uma mensagem carrega no máximo UM arquivo, então os campos vivem na
-- própria linha em vez de numa tabela à parte: uma tabela para uma
-- cardinalidade 0..1 só adicionaria join.
--
-- Caminho no storage: `<workspace>/chat/<canal>/<mensagem>-<arquivo>`.
--
-- O primeiro nível PRECISA ser o uuid do workspace porque as policies de
-- storage (0006) fazem `(storage.foldername(name))[1]::uuid` e chamam
-- `is_member`. Um prefixo "chat/" no topo quebraria o cast.
--
-- O segundo nível ser "chat" e não um uuid é igualmente proposital: a
-- varredura de órfãos (`/api/cron/limpar-anexos`) só toca em
-- `<uuid>/<uuid>/...`, que é o formato do anexo de DEMANDA. Sem essa
-- diferença, ela apagaria todo arquivo de chat no domingo seguinte, por não
-- encontrá-lo na tabela `attachment`.
-- =====================================================================

alter table public.chat_message
  add column storage_key     text,
  add column file_name       text,
  add column file_size_bytes bigint,
  add column mime_type       text;

-- Mensagem só com arquivo é legítima — "toma o documento" sem texto é uso
-- normal de chat. O corpo continua limitado, mas deixa de ser obrigatório
-- quando há arquivo.
alter table public.chat_message
  drop constraint chat_message_body_check;
alter table public.chat_message
  add constraint chat_message_body_check
  check (
    char_length(body) <= 4000
    and (char_length(body) > 0 or storage_key is not null)
  );

-- Coerência: ou tem os dados do arquivo, ou não tem arquivo nenhum. Sem
-- isto daria para gravar uma chave sem nome, e a interface não teria o que
-- mostrar no lugar do rótulo.
alter table public.chat_message
  add constraint chat_message_file_complete
  check (
    (storage_key is null and file_name is null)
    or (storage_key is not null and file_name is not null)
  );

create index chat_message_file_idx
  on public.chat_message (workspace_id)
  where storage_key is not null;
