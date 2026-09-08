-- =====================================================================
-- TAFLOW — 0090_pix_vencido
-- Dá saída a quem deixou o código Pix vencer.
--
-- O índice único (workspace_id, period_start) da 0049 diz "UM ciclo, UMA
-- cobrança", e ele está certo: é o que impede cobrar o mesmo mês duas
-- vezes. O efeito colateral é que, quando o código Pix expira, a empresa
-- fica sem saída — não dá para emitir outra cobrança do mesmo período, e a
-- tela chegava a prometer que dava.
--
-- A saída é renovar a MESMA linha: código novo, dívida igual. E aí aparece
-- o problema de verdade desta migration.
--
-- **O webhook acha a fatura pelo `provider_charge_id`.** Trocar o txid sem
-- guardar o antigo abre uma janela: um Pix pago pouco antes do vencimento,
-- com aviso atrasado — a EFI reenvia até receber 200 —, chega com o txid
-- velho e não casa com fatura nenhuma. O `processarAviso` responde
-- "sem_fatura" com 200, e está certo em responder: reenviar não faria
-- aparecer. O resultado é dinheiro recebido que ninguém credita, e um
-- cliente cobrado de novo por um mês que ele pagou.
--
-- Por isso o txid vira HISTÓRICO. Cada renovação empilha mais um, e o
-- webhook procura na lista inteira.
-- =====================================================================

alter table public.subscription_charge
  add column provider_charge_ids text[] not null default '{}';

comment on column public.subscription_charge.provider_charge_ids is
  'Todo txid já emitido para esta fatura, do mais antigo ao mais novo (0090). O webhook procura aqui: código renovado não pode fazer o pagamento do código anterior deixar de casar.';

-- O que já existe entra no histórico. Sem isto, um pagamento atrasado de
-- uma cobrança anterior à migration não seria encontrado pela busca nova.
update public.subscription_charge
   set provider_charge_ids = array[provider_charge_id]
 where provider_charge_id is not null
   and provider_charge_ids = '{}';

-- GIN porque a busca é "contém este elemento", e ela roda a cada aviso de
-- pagamento — é caminho de dinheiro, não de relatório.
create index subscription_charge_txids_idx
  on public.subscription_charge using gin (provider_charge_ids);

-- ------------------------------------------------- renovar sem duplicar
--
-- Uma instrução só, e é de propósito: ler o array em TypeScript, somar o
-- txid novo e gravar de volta perderia um txid se dois pedidos chegassem
-- juntos — e txid perdido é pagamento perdido. `array_append` dentro do
-- UPDATE não tem esse intervalo.
--
-- A GUARDA é a outra metade. Só renova o que está vencido:
--
--   * `expirada` — a varredura diária já passou por ela;
--   * `aberta` com `expires_at` no passado — a varredura ainda não passou.
--     O cron é diário enquanto a conta for Hobby (regra 13 do CLAUDE.md),
--     então essa janela chega a 24h e ninguém deve esperar por ela.
--
-- O que a guarda RECUSA importa mais: fatura `paga` não volta a aberta por
-- um clique atrasado, e `cancelada` não ressuscita — cancelar é decisão de
-- alguém, não um estado transitório. Dois cliques ao mesmo tempo: o
-- primeiro renova, o segundo encontra `expires_at` no futuro e recebe
-- `null`. Uma cobrança viva por vez.
create or replace function public.renovar_cobranca(
  p_charge_id          uuid,
  p_provider_charge_id text,
  p_qr_code            text,
  p_copia_e_cola       text,
  p_expires_at         timestamptz
)
returns boolean
language sql
set search_path = public
as $$
  update public.subscription_charge
     set status              = 'aberta',
         provider_charge_id  = p_provider_charge_id,
         provider_charge_ids = case
           when p_provider_charge_id is null then provider_charge_ids
           when p_provider_charge_id = any(provider_charge_ids)
             then provider_charge_ids
           else array_append(provider_charge_ids, p_provider_charge_id)
         end,
         qr_code      = p_qr_code,
         copia_e_cola = p_copia_e_cola,
         expires_at   = p_expires_at
   where id = p_charge_id
     and (
       status = 'expirada'
       or (status = 'aberta' and expires_at is not null and expires_at <= now())
     )
  returning true;
$$;

comment on function public.renovar_cobranca(uuid, text, text, text, timestamptz) is
  'Troca o código Pix de uma fatura vencida mantendo a dívida e o histórico de txid (0090). Devolve null quando não havia o que renovar.';

-- Não é `security definer`: ela não precisa contornar RLS, porque só a
-- chave secreta chama — e a chave secreta já ignora RLS. Definer aqui seria
-- a armadilha da 0087 de novo, agora numa função que mexe em dinheiro.
--
-- `revoke from public` porque o padrão do Postgres é conceder a todos, e
-- "todos" inclui a chave publishable, que roda no navegador de qualquer
-- cliente. Renovar cobrança não é ação de quem está logado: é ação do
-- servidor, depois de conferir quem pediu.
revoke all on function public.renovar_cobranca(uuid, text, text, text, timestamptz) from public;
revoke all on function public.renovar_cobranca(uuid, text, text, text, timestamptz) from anon;
revoke all on function public.renovar_cobranca(uuid, text, text, text, timestamptz) from authenticated;
grant execute on function public.renovar_cobranca(uuid, text, text, text, timestamptz) to service_role;
