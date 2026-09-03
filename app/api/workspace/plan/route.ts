import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Escolha de plano por quem está testando.
 *
 * Roda no servidor com a chave secreta porque `workspace` deixou de aceitar
 * escrita do cliente na 0059 — um dono conseguia mudar os próprios assentos
 * e o próprio vencimento pelo navegador.
 *
 * **Escolher plano grava intenção, não contrato.** `plan_id` muda; assentos,
 * vencimento e situação não. Enquanto a cobrança não existe, deixar a
 * escolha ajustar `seat_limit` seria dar assentos de graça a quem clicar no
 * plano mais caro. Quem aplica o plano de verdade é você, no painel da
 * plataforma, quando o pagamento entrar.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { workspaceId?: string; planId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.workspaceId || !body.planId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = createAdminClient();

  // Só o dono escolhe o plano da própria empresa. A chave secreta ignora
  // RLS, então a checagem é aqui e é explícita.
  const { data: membro } = await db
    .from("workspace_member")
    .select("role, status")
    .eq("workspace_id", body.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membro || membro.status !== "active" || membro.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Do vitalício não se sai clicando (0085).
  //
  // O plano é privado, então quem o deixasse não conseguiria voltar: ele não
  // aparece nesta lista nem no cadastro, e só a plataforma reatribui. Um
  // clique curioso apagaria uma promessa de forma irreversível, sem nada
  // registrando que ela existiu.
  //
  // Quem realmente quiser um plano maior fala com a gente — e aí quem move é
  // quem pode desfazer.
  const { data: empresa } = await db
    .from("workspace")
    .select("plan_id")
    .eq("id", body.workspaceId)
    .maybeSingle();
  if (empresa?.plan_id) {
    const { data: atual } = await db
      .from("billing_plan")
      .select("vitalicio")
      .eq("id", empresa.plan_id)
      .maybeSingle();
    if (atual?.vitalicio) {
      return NextResponse.json(
        {
          error: "plano_vitalicio",
          message:
            "Seu acesso é vitalício e não tem cobrança. Fale com a gente " +
            "antes de trocar: a troca não se desfaz sozinha.",
        },
        { status: 409 }
      );
    }
  }

  // Só plano publicado. Plano feito sob medida para outro cliente não pode
  // ser escolhido por quem descobriu o id.
  const { data: plano } = await db
    .from("billing_plan")
    .select("id, name")
    .eq("id", body.planId)
    .eq("is_public", true)
    .eq("active", true)
    .maybeSingle();
  if (!plano) {
    return NextResponse.json({ error: "plan_not_available" }, { status: 400 });
  }

  const { error } = await db
    .from("workspace")
    .update({ plan_id: plano.id })
    .eq("id", body.workspaceId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, plan: plano.name });
}
