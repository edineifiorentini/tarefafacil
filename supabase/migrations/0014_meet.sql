-- =====================================================================
-- TarefaFácil — 0014_meet
-- Link do Google Meet por tarefa. Opt-in; só vale para tarefa sincronizada.
-- O Meet é criado via conferenceData no evento (escopo calendar.events já
-- concedido — sem escopo novo).
-- =====================================================================

alter table public.task
  -- pedido do usuário: criar link do Meet ao sincronizar
  add column if not exists gcal_add_meet boolean not null default false,
  -- link gerado pelo Google (mostrado no painel)
  add column if not exists gcal_meet_url text;
