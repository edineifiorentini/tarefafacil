-- =====================================================================
-- TarefaFácil — 0054_chat_audio
-- Recado de voz no chat.
--
-- Não há tabela nova: recado de voz é o anexo da 0048 com um tocador na
-- frente. `storage_key`, `mime_type`, `file_name` e `file_size_bytes` já
-- existem, o caminho `<workspace>/chat/<canal>/` já é o certo e a varredura
-- de órfãos já reconhece esse ramo.
--
-- Falta um dado só: a DURAÇÃO.
--
-- Ela é gravada aqui, e não lida do arquivo, por dois motivos:
--
-- 1. O tocador precisa dizer "0:42" ANTES de tocar. Ler do arquivo exigiria
--    assinar a URL e baixar o áudio de toda mensagem só para desenhar a
--    lista — que é o oposto de deixar a pessoa decidir se vale ouvir.
--
-- 2. WebM saído do `MediaRecorder` não traz duração no cabeçalho: o
--    elemento <audio> devolve `Infinity` até alguém procurar até o fim.
--    Quem sabe quanto tempo durou é quem gravou, e é lá que medimos.
--
-- Fica anulável: mensagem antiga não tem, e áudio que alguém anexe como
-- arquivo comum também não.
-- =====================================================================

alter table public.chat_message
  add column audio_duration_ms integer
    check (audio_duration_ms is null or audio_duration_ms > 0);
