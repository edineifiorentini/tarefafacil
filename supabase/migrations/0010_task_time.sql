-- =====================================================================
-- TarefaFácil — 0010_task_time
-- Horário de término opcional, para reservar um intervalo na agenda
-- (ex.: reunião das 15:30 às 17:00). Regras:
--   due_time null                 → evento de dia inteiro
--   due_time, due_end_time null   → evento com hora, duração padrão 30min
--   due_time < due_end_time       → evento do início ao fim
-- =====================================================================

alter table public.task
  add column if not exists due_end_time time;
