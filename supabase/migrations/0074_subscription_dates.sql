-- =====================================================================
-- 0074 — Datas de cancelamento da assinatura
--
-- Duas colunas que a especificação pede e o schema não tinha.
--
-- 1. `cancel_at` — CANCELAMENTO AGENDADO (11.3 e 9.2). Quem cancela no meio
--    do ciclo pago não deve perder o que já pagou: marca-se a data em que a
--    assinatura termina e o acesso continua até lá. Sem esta coluna, cancelar
--    só podia ser imediato, e "cancelamento agendado" era um estado que a
--    interface não tinha como representar.
--
-- 2. `canceled_at` — QUANDO O CANCELAMENTO ACONTECEU DE FATO.
--
--    Isto conserta um erro conhecido do painel: o churn usava
--    `subscription.updated_at` como data de cancelamento, que é "última
--    alteração de qualquer coisa". Uma assinatura cancelada em março e depois
--    tocada por outro motivo em agosto contava como churn de agosto. A
--    ressalva estava escrita na dica do cartão; agora deixa de ser
--    necessária.
--
--    As linhas já canceladas recebem `updated_at` como aproximação — é o que
--    se sabe delas. Melhor um valor declaradamente aproximado no passado do
--    que um nulo que some do cálculo.
-- =====================================================================

alter table public.subscription
  add column if not exists cancel_at   timestamptz,
  add column if not exists canceled_at timestamptz;

comment on column public.subscription.cancel_at is
  'Cancelamento agendado (0074): a assinatura termina nesta data e o acesso '
  'vale até lá. Null = sem agendamento.';

comment on column public.subscription.canceled_at is
  'Quando o cancelamento aconteceu (0074). Base do churn — antes usava-se '
  'updated_at, que é "última alteração" e datava errado.';

-- Retroativo para o que já está cancelado. `updated_at` é o melhor palpite
-- disponível, e sem isto o churn histórico ficaria zerado.
update public.subscription
   set canceled_at = updated_at
 where status = 'cancelada'
   and canceled_at is null;

-- Cancelamentos agendados que já venceram viram fila de trabalho: quem
-- procura "o que precisa ser encerrado hoje" lê por esta coluna.
create index if not exists subscription_cancel_at_idx
  on public.subscription (cancel_at)
  where cancel_at is not null;
