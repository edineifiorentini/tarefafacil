import { redirect } from "next/navigation";

import { AcceptInvite } from "@/components/workspace/AcceptInvite";
import { createClient } from "@/lib/supabase/server";

// Fica FORA do grupo (app): o aceite não pode passar pela guarda de workspace
// do layout — senão o convidado (sem workspace ativo) cai no onboarding e
// acaba criando um workspace novo em vez de entrar no de quem convidou.
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // accept_invite usa auth.uid(): é preciso estar logado. Preserva o destino
  // para voltar ao convite depois do login.
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/convite/${token}`)}`);
  }

  return <AcceptInvite token={token} />;
}
