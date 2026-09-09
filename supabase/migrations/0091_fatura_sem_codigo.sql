-- =====================================================================
-- TAFLOW — 0091_fatura_sem_codigo
-- A guarda da renovação passa a alcançar a fatura que nunca teve código.
--
-- A 0090 deixou renovar dois casos: `expirada`, e `aberta` com o prazo já
-- vencido. Faltou o terceiro, e ele apareceu em produção em 8/set/2026.
--
-- A fatura nasce ANTES da ida ao provedor — é o que faz o índice único
-- segurar dois cliques simultâneos. Quando o provedor recusa, sobra uma
-- linha `aberta`, sem txid e sem copia e cola: impagável. E como o período
-- passa a contar como cobrado, nada mais podia ser gerado naquele mês. O
-- cliente ficava preso até o prazo de sete dias correr — uma semana
-- esperando um código que nunca existiu.
--
-- **Fatura de cobrança manual não entra nisso.** Ela nasce sem código de
-- propósito: quem manda o Pix é uma pessoa. Por isso a condição olha o
-- `provider` antes do código — a pergunta não é "tem código", é "havia um
-- provedor que deveria ter dado um".
-- =====================================================================

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
       or (
         status = 'aberta'
         and (
           (expires_at is not null and expires_at <= now())
           or (provider <> 'manual' and copia_e_cola is null)
         )
       )
     )
  returning true;
$$;

comment on function public.renovar_cobranca(uuid, text, text, text, timestamptz) is
  'Troca o código Pix de uma fatura vencida ou que ficou sem código, mantendo a dívida e o histórico de txid (0090, 0091). Devolve null quando não havia o que renovar.';

-- `create or replace` preserva as permissões que já existem, mas repetir é
-- barato e a consequência de errar não é: esta função mexe em dinheiro e
-- não pode responder à chave que roda no navegador.
revoke all on function public.renovar_cobranca(uuid, text, text, text, timestamptz) from public;
revoke all on function public.renovar_cobranca(uuid, text, text, text, timestamptz) from anon;
revoke all on function public.renovar_cobranca(uuid, text, text, text, timestamptz) from authenticated;
grant execute on function public.renovar_cobranca(uuid, text, text, text, timestamptz) to service_role;
