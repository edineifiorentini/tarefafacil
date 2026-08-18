-- =====================================================================
-- TarefaFácil — 0045_finance_recurrence
-- Lançamento que se repete: aluguel todo dia 5, assinatura todo mês,
-- imposto todo trimestre (spec §8.9).
--
-- A REGRA é uma linha aqui; cada OCORRÊNCIA é uma linha em finance_entry,
-- materializada. Ocorrência virtual não serviria: cada uma precisa de
-- situação, valor e nota fiscal próprios — "confirmar março" tem de poder
-- acontecer sem mexer em abril.
--
-- A idempotência não é escrita aqui: vem do índice único que já existe em
-- (source_type, source_id, installment_number) desde a 0033. Recorrência usa
-- source_type = 'recurrence', então nunca colide com parcela de contrato —
-- que é o que o §8.9 pede ao dizer que alterações não podem duplicar
-- parcelas originadas por contrato.
-- =====================================================================

create table public.finance_recurrence (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  kind         text not null check (kind in ('entrada', 'saida')),
  description  text not null check (char_length(description) between 1 and 200),
  amount_cents bigint not null check (amount_cents > 0),
  category     text,
  client_id    uuid references public.client(id) on delete set null,

  -- Vocabulário igual ao de contrato, de propósito: uma noção a menos para
  -- aprender. 'unico' não entra — lançamento único não é recorrência.
  frequency    text not null check (frequency in ('mensal', 'trimestral', 'anual')),
  starts_on    date not null,
  -- Nulo = sem fim previsto. Gera por horizonte, não até o infinito.
  ends_on      date,

  -- Desligar para de gerar sem apagar o que já foi gerado nem o histórico.
  active       boolean not null default true,

  created_by   uuid references public.app_user(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index finance_recurrence_workspace_idx
  on public.finance_recurrence (workspace_id, active);

alter table public.finance_recurrence enable row level security;

-- Mesmo portão do resto do Financeiro: dono e admin.
create policy finance_recurrence_select on public.finance_recurrence
  for select using (public.has_role(workspace_id, array['owner', 'admin']));
create policy finance_recurrence_write on public.finance_recurrence
  for all using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

create trigger finance_recurrence_touch
  before update on public.finance_recurrence
  for each row execute function public.set_updated_at();

-- Nota: finance_entry.source_id NÃO tem chave estrangeira para cá, e é
-- intencional. Apagar a regra não pode apagar o que já foi lançado — o
-- dinheiro daqueles meses aconteceu. As ocorrências continuam existindo,
-- órfãs da regra.
