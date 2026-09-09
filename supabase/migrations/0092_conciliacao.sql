-- =====================================================================
-- TAFLOW — 0092_conciliacao
-- Quando o aviso se perde, alguém precisa perguntar.
--
-- O webhook é a fonte oficial da confirmação, e continua sendo. Mas em
-- 9/set/2026 um pagamento de verdade chegou, foi notificado no horário e
-- não quitou nada — e o único alerta possível era um cliente reclamando.
-- Aviso se perde: rede cai, deploy acontece no meio, o provedor desiste
-- depois de N tentativas. Sem alguém para perguntar "e aquela fatura?", o
-- dinheiro entra e o acesso não.
--
-- Esta coluna é o que torna essa pergunta barata. A tela vai consultar o
-- estado com frequência, e **consulta de tela lê o banco**; quem fala com o
-- provedor é a conciliação, e ela precisa saber quando falou pela última
-- vez para não repetir a cada clique.
--
-- Sem isto, o botão "Verificar agora" viraria uma torneira aberta contra a
-- API da EFI: um clique nervoso por segundo, e cada um custando uma ida de
-- rede autenticada.
-- =====================================================================

alter table public.subscription_charge
  add column provider_checked_at timestamptz;

comment on column public.subscription_charge.provider_checked_at is
  'Última vez que o servidor perguntou o estado desta cobrança ao provedor (0092). Segura a frequência da conciliação — não é o mesmo que `paid_at`, que é quando o dinheiro entrou.';

-- A varredura procura fatura aberta e vencendo, ou aberta e sem conferência
-- recente. Índice parcial porque fatura paga é a maioria e não interessa
-- para esta pergunta.
create index subscription_charge_conciliar_idx
  on public.subscription_charge (provider_checked_at nulls first)
  where status = 'aberta';
