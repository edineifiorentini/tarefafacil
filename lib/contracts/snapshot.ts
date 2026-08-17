import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildTemplateContext,
  resolveConditionals,
  substituteVariables,
} from "@/lib/contracts/template";
import type { Database } from "@/types/database";

/**
 * Congela o texto do contrato quando ele deixa de ser rascunho.
 *
 * Guarda o texto JÁ RESOLVIDO (variáveis substituídas), não o modelo cru.
 * Isso é mais forte do que apenas versionar o modelo: um contrato enviado
 * não muda nem se alguém editar o modelo, nem se o cadastro do cliente for
 * corrigido depois (spec 9.4).
 *
 * Idempotente: se já existe snapshot, não sobrescreve — o documento
 * original é a fonte de verdade a partir do envio.
 */
export async function freezeContractBody(
  supabase: SupabaseClient<Database>,
  contractId: string
): Promise<void> {
  const { data: contract } = await supabase
    .from("contract")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract) return;
  if (contract.body_snapshot) return; // já congelado
  if (!contract.template_id) return; // sem modelo não há corpo para congelar

  const [{ data: template }, { data: client }, { data: org }] =
    await Promise.all([
      supabase
        .from("contract_template")
        .select("*")
        .eq("id", contract.template_id)
        .maybeSingle(),
      supabase
        .from("client")
        .select("*")
        .eq("id", contract.client_id)
        .maybeSingle(),
      supabase
        .from("workspace_profile")
        .select("*")
        .eq("workspace_id", contract.workspace_id)
        .maybeSingle(),
    ]);

  if (!template) return;

  const context = buildTemplateContext({
    contract,
    client,
    org,
    today: new Date().toLocaleDateString("pt-BR"),
  });
  const resolved = substituteVariables(
    resolveConditionals(template.body, context),
    context
  );

  await supabase
    .from("contract")
    .update({
      body_snapshot: resolved,
      template_version: template.version,
      snapshot_at: new Date().toISOString(),
    })
    .eq("id", contractId);
}
