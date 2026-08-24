"use client";

import { TERMS_VERSION } from "@/lib/auth/terms";
import { createClient } from "@/lib/supabase/client";
import { onlyDigits } from "@/lib/validation/document";

/**
 * Fecha o cadastro: perfil da organização, aceite dos termos e o carimbo de
 * "completou".
 *
 * Roda em dois momentos diferentes, de propósito:
 *
 * - **Cadastro com senha**, quando o Supabase devolve sessão na hora. Os
 *   dados vêm do formulário e são gravados no mesmo segundo.
 * - **Primeiro login**, quando a conta veio do Google ou quando a
 *   confirmação de e-mail adiou a sessão. Aí os dados vêm da tela de
 *   completar cadastro.
 *
 * É a mesma função porque é o mesmo fecho: um caminho só, sem dois lugares
 * gravando as mesmas quatro coisas de jeitos ligeiramente diferentes.
 */

export type SignupProfile = {
  fullName: string;
  documentType: "pf" | "pj";
  /** CPF ou CNPJ, com ou sem máscara. */
  document: string;
  acceptedTerms: boolean;
};

export async function completeSignup(profile: SignupProfile): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("sem sessão");

  const nome = profile.fullName.trim();

  // 1. Nome de quem entrou.
  const { error: userError } = await supabase
    .from("app_user")
    .update({
      display_name: nome,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (userError) throw userError;

  // 2. Identidade da organização — a mesma que sai nos contratos.
  const { data: membro } = await supabase
    .from("workspace_member")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (membro) {
    const { error: perfilError } = await supabase
      .from("workspace_profile")
      .upsert(
        {
          workspace_id: membro.workspace_id,
          document_type: profile.documentType,
          document: onlyDigits(profile.document) || null,
          // Pessoa física assina em nome próprio: o nome dela é a razão
          // social do contratado. Empresa preenche a razão social depois,
          // em Configurações, junto do resto da identidade fiscal.
          ...(profile.documentType === "pf"
            ? { legal_name: nome, representative_name: nome }
            : { representative_name: nome }),
          email: user.email,
        },
        { onConflict: "workspace_id" }
      );
    if (perfilError) throw perfilError;
  }

  // 3. Aceite. O índice único deixa reexecutar sem duplicar.
  if (profile.acceptedTerms) {
    const { error: termosError } = await supabase
      .from("terms_acceptance")
      .upsert(
        { user_id: user.id, version: TERMS_VERSION },
        { onConflict: "user_id,version", ignoreDuplicates: true }
      );
    if (termosError) throw termosError;
  }
}
