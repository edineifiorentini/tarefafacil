import { NextResponse } from "next/server";

import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import { requirePlatformAdmin } from "@/lib/admin/admin";
import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/**
 * Ações sobre a assinatura de uma empresa (especificação 11.4).
 *
 * **Sobre idempotência**, que era o risco levantado antes de começar: as três
 * ações daqui escrevem um ESTADO, não somam um evento. Cancelar duas vezes
 * deixa cancelada; agendar duas vezes deixa a última data; reativar duas
 * vezes deixa ativa. Nenhuma cobra ninguém, porque este projeto ainda não
 * gera cobrança — `subscription_charge` está vazia e `lib/billing/cycle.ts`
 * não tem chamador. Chave de idempotência entra junto com a primeira ação
 * que fale com um provedor de pagamento, e não antes: cerimônia sem risco é
 * só código a mais para manter.
 */

type Acao = "cancelar" | "agendar_cancelamento" | "reativar";

type Corpo = {
  acao?: string;
  motivo?: string;
  /** Data do cancelamento agendado, "YYYY-MM-DD". */
  data?: string;
};

function ehAcao(v: unknown): v is Acao {
  return v === "cancelar" || v === "agendar_cancelamento" || v === "reativar";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { workspaceId } = await params;

  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!ehAcao(corpo.acao)) {
    return NextResponse.json({ error: "acao_invalida" }, { status: 400 });
  }
  const acao = corpo.acao;

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

  const db = createAdminClient();
  const [empresaRes, assinRes] = await Promise.all([
    db.from("workspace").select("id, name").eq("id", workspaceId).maybeSingle(),
    db
      .from("subscription")
      .select("workspace_id, status, cancel_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const empresa = empresaRes.data;
  if (!empresa) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const assinatura = assinRes.data as {
    status: string;
    cancel_at: string | null;
  } | null;

  if (!assinatura) {
    return NextResponse.json(
      {
        error: "sem_assinatura",
        message:
          "Esta empresa não tem assinatura. Atribua um plano na página dela primeiro.",
      },
      { status: 409 }
    );
  }

  let resumo = "";
  let detalhes: Json = { motivo, empresa: empresa.name };

  switch (acao) {
    case "cancelar": {
      const agora = new Date().toISOString();
      const { error } = await db
        .from("subscription")
        .update({ status: "cancelada", canceled_at: agora, cancel_at: null })
        .eq("workspace_id", workspaceId);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `cancelou a assinatura de "${empresa.name}"`;
      detalhes = { ...(detalhes as object), de: assinatura.status } as Json;
      break;
    }

    case "agendar_cancelamento": {
      const data = (corpo.data ?? "").trim();
      // "YYYY-MM-DD" exato: aceitar formato livre aqui deixaria a coluna com
      // datas que o Postgres interpreta de um jeito e a tela de outro.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return NextResponse.json(
          { error: "data_invalida", message: "Escolha a data do cancelamento" },
          { status: 400 }
        );
      }
      const quando = new Date(`${data}T23:59:59`);
      if (Number.isNaN(quando.getTime())) {
        return NextResponse.json(
          { error: "data_invalida", message: "Data inválida" },
          { status: 400 }
        );
      }
      if (quando.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error: "data_no_passado",
            message:
              "A data precisa ser futura. Para encerrar agora, use cancelar imediatamente.",
          },
          { status: 400 }
        );
      }
      if (assinatura.status === "cancelada") {
        return NextResponse.json(
          {
            error: "ja_cancelada",
            message:
              "A assinatura já está cancelada. Reative antes de agendar.",
          },
          { status: 409 }
        );
      }

      const { error } = await db
        .from("subscription")
        .update({ cancel_at: quando.toISOString() })
        .eq("workspace_id", workspaceId);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `agendou o cancelamento de "${empresa.name}" para ${data}`;
      detalhes = { ...(detalhes as object), para: data } as Json;
      break;
    }

    case "reativar": {
      // Reativar limpa as DUAS datas: uma assinatura reativada que guardasse
      // o agendamento antigo morreria sozinha na data marcada, e ninguém
      // lembraria por quê.
      const { error } = await db
        .from("subscription")
        .update({ status: "ativa", cancel_at: null, canceled_at: null })
        .eq("workspace_id", workspaceId);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `reativou a assinatura de "${empresa.name}"`;
      detalhes = {
        ...(detalhes as object),
        de: assinatura.status,
        agendamentoRemovido: assinatura.cancel_at,
      } as Json;
      break;
    }
  }

  await registrarEventoDePlataforma({
    autor: admin.email,
    acao: "alterou",
    entidade: "subscription",
    entidadeId: workspaceId,
    resumo,
    detalhes,
  });

  return NextResponse.json({ ok: true });
}
