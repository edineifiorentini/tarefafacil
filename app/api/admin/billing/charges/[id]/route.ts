import { NextResponse } from "next/server";

import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import { requirePlatformAdmin } from "@/lib/admin/admin";
import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { registrarPagamento } from "@/lib/billing/settle";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ações sobre uma fatura: registrar o pagamento e cancelar.
 *
 * Registrar pagamento é a ação que fecha o ciclo sem provedor nenhum — o
 * dono recebe o Pix por fora, marca aqui, e o acesso é empurrado. Ela mexe
 * em acesso pago, então exige motivo e é auditada como qualquer outra.
 */

type Corpo = {
  acao?: string;
  motivo?: string;
  /** Valor recebido, em centavos. Ausente = o valor cheio da fatura. */
  valorCents?: number;
  /** Data do pagamento, "YYYY-MM-DD". Ausente = agora. */
  pagoEm?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (corpo.acao !== "registrar_pagamento" && corpo.acao !== "cancelar") {
    return NextResponse.json({ error: "acao_invalida" }, { status: 400 });
  }

  const motivo = (corpo.motivo ?? "").trim();
  if (motivo.length === 0) {
    return NextResponse.json(
      { error: "motivo_invalido", message: "Escreva o motivo desta ação" },
      { status: 400 }
    );
  }
  if (motivo.length < MOTIVO_MINIMO) {
    return NextResponse.json(
      {
        error: "motivo_invalido",
        message: `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`,
      },
      { status: 400 }
    );
  }

  if (corpo.acao === "registrar_pagamento") {
    // Valor negativo ou zero não é pagamento parcial, é engano de digitação.
    if (corpo.valorCents !== undefined && corpo.valorCents <= 0) {
      return NextResponse.json(
        {
          error: "valor_invalido",
          message: "O valor precisa ser maior que zero",
        },
        { status: 400 }
      );
    }

    const resultado = await registrarPagamento({
      chargeId: id,
      valorCents: corpo.valorCents,
      pagoEm: corpo.pagoEm ? `${corpo.pagoEm}T12:00:00.000Z` : undefined,
      autor: admin.email,
      motivo,
    });

    if (!resultado.ok) {
      const status =
        resultado.erro === "not_found"
          ? 404
          : resultado.erro === "ja_paga" || resultado.erro === "cancelada"
            ? 409
            : 500;
      return NextResponse.json(
        { error: resultado.erro, message: resultado.mensagem },
        { status }
      );
    }

    return NextResponse.json({ ok: true, acessoAte: resultado.acessoAte });
  }

  // Cancelar a fatura.
  const db = createAdminClient();
  const { data: fatura } = await db
    .from("subscription_charge")
    .select("id, plan_name, period_start, status")
    .eq("id", id)
    .maybeSingle();

  if (!fatura) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (fatura.status === "paga") {
    return NextResponse.json(
      {
        error: "ja_paga",
        message:
          "Fatura paga não se cancela. Para devolver o dinheiro, o caminho é um reembolso — que ainda não existe aqui.",
      },
      { status: 409 }
    );
  }

  const { error } = await db
    .from("subscription_charge")
    .update({ status: "cancelada" })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "falhou" }, { status: 500 });
  }

  await registrarEventoDePlataforma({
    autor: admin.email,
    acao: "alterou",
    entidade: "subscription_charge",
    entidadeId: id,
    resumo: `cancelou a fatura de ${fatura.plan_name} (${fatura.period_start})`,
    detalhes: { motivo },
  });

  return NextResponse.json({ ok: true });
}
