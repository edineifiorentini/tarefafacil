-- =====================================================================
-- TarefaFácil — 0033_finance_source
-- Integração Contrato → Financeiro (spec §13.1). Lançamento ganha origem
-- rastreável (source_type/source_id) + número de parcela, com índice
-- único parcial: a MESMA parcela de uma MESMA origem nunca duplica —
-- é a "constraint/idempotency key" que o spec pede explicitamente.
-- Lançamentos manuais (source_type nulo) não são afetados pela restrição.
-- =====================================================================

alter table public.finance_entry
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists installment_number int;

create unique index if not exists finance_entry_source_unique
  on public.finance_entry (source_type, source_id, installment_number)
  where source_type is not null;

create index if not exists finance_entry_source_idx
  on public.finance_entry (source_type, source_id)
  where source_type is not null;
