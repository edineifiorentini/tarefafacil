-- =====================================================================
-- TarefaFácil — 0009_gcal_sync  (E16)
-- Sincronização bidirecional: syncToken incremental, canal de watch e
-- marcação de edição externa (com snapshot para desfazer em 24h).
-- =====================================================================

alter table public.google_connection
  add column if not exists sync_token          text,
  add column if not exists channel_id          text,
  add column if not exists channel_resource_id text,
  add column if not exists channel_expiration  timestamptz;

alter table public.task
  -- Quando a última mudança veio do Google (marcador visível — design 9.6).
  add column if not exists gcal_external_edit_at timestamptz,
  -- Snapshot para desfazer por 24h: { kind, title, description, due_date, due_time }.
  add column if not exists gcal_undo             jsonb;
