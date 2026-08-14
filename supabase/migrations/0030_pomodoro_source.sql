-- =====================================================================
-- TarefaFácil — 0030_pomodoro_source
-- Distingue apontamentos manuais de pomodoros concluídos automaticamente
-- (sem contador redundante — a contagem de pomodoros é derivada contando
-- as linhas com source='pomodoro').
-- =====================================================================

alter table public.task_time_entry
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'pomodoro'));
