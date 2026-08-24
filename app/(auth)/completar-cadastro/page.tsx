import { redirect } from "next/navigation";

import { CompleteSignupForm } from "@/components/auth/CompleteSignupForm";
import { createClient } from "@/lib/supabase/server";

/**
 * Falta preencher o cadastro.
 *
 * Fica fora do AppShell de propósito: quem não terminou o cadastro não
 * deveria ver a barra lateral e sair navegando. É uma tela só, com saída
 * única — e o porteiro está no layout de (app), que redireciona para cá
 * enquanto  for nulo.
 */
export default async function CompletarCadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("app_user")
    .select("display_name, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  // Já terminou: não há o que completar.
  if (perfil?.onboarding_completed_at) redirect("/hoje");

  // O que a pessoa digitou no cadastro viaja nos metadados do usuário e
  // volta aqui já preenchido — ela confirma em vez de digitar de novo.
  const meta = user.user_metadata as {
    full_name?: string;
    name?: string;
    document_type?: "pf" | "pj";
    document?: string;
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-12">
      <h1 className="text-fg mb-1 text-[length:var(--text-h2-size)] font-medium">
        Falta pouco
      </h1>
      <p className="text-fg-secondary mb-8">
        Precisamos destes dados para emitir contrato e cobrança no seu nome.
      </p>

      <CompleteSignupForm
        defaultName={meta.full_name ?? meta.name ?? perfil?.display_name ?? ""}
        defaultType={meta.document_type ?? "pf"}
        defaultDocument={meta.document ?? ""}
      />
    </main>
  );
}
