import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import {
  ACOES,
  ehAcaoDeEmpresa,
  validarMotivo,
  type AcaoDeEmpresa,
} from "@/lib/admin/actions";
import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { DIAS_ATE_REMOCAO_FISICA } from "@/lib/admin/company";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditAction, Json } from "@/types/database";

/**
 * Ações administrativas sobre uma empresa.
 *
 * Três regras que valem para TODAS elas:
 *
 * 1. **A autorização é aqui.** Esconder o botão no navegador não é controle
 *    de acesso — qualquer pessoa com sessão pode chamar esta rota à mão.
 * 2. **O motivo é validado no servidor**, com a mesma função que o diálogo
 *    usa. Um cliente adulterado não passa sem motivo.
 * 3. **A auditoria vem DEPOIS do sucesso**, e nunca desfaz a ação se falhar.
 *    Perder a linha do log é ruim; desfazer uma suspensão já aplicada por
 *    causa do log é pior.
 */

type Corpo = {
  acao?: string;
  motivo?: string;
  /** Confirmação por digitação, para o que é difícil de desfazer. */
  nomeDigitado?: string;
  /** Carga da ação: plano novo, número de assentos, dias, texto da nota. */
  valor?: string | number | null;
};

/** Qual verbo de auditoria cada ação registra. */
const VERBO: Record<AcaoDeEmpresa, AuditAction> = {
  alterar_plano: "alterou",
  alterar_assentos: "alterou",
  conceder_acesso: "alterou",
  encerrar_teste: "alterou",
  iniciar_teste: "alterou",
  editar_contato: "alterou",
  suspender: "alterou",
  reativar: "alterou",
  excluir: "excluiu",
  restaurar: "alterou",
  anotar: "criou",
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

  if (!ehAcaoDeEmpresa(corpo.acao)) {
    return NextResponse.json({ error: "acao_invalida" }, { status: 400 });
  }
  const acao = corpo.acao;
  const definicao = ACOES[acao];

  const erroDeMotivo = validarMotivo(acao, corpo.motivo);
  if (erroDeMotivo) {
    return NextResponse.json(
      { error: "motivo_invalido", message: erroDeMotivo },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const { data: empresa } = await db
    .from("workspace")
    .select(
      "id, name, plan_id, seat_limit, trial, access_expires_at, suspended, deleted_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!empresa) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Confirmação por digitação: comparada aqui, não só no diálogo.
  if (definicao.exigeNome) {
    if ((corpo.nomeDigitado ?? "").trim() !== empresa.name) {
      return NextResponse.json(
        { error: "nome_nao_confere", message: "O nome digitado não confere" },
        { status: 400 }
      );
    }
  }

  const motivo = (corpo.motivo ?? "").trim();
  let resumo = "";
  let detalhes: Json = { motivo, empresa: empresa.name };

  switch (acao) {
    case "alterar_plano": {
      const planoId = typeof corpo.valor === "string" ? corpo.valor : null;
      const { data: plano } = planoId
        ? await db
            .from("billing_plan")
            .select("id, name, max_users")
            .eq("id", planoId)
            .maybeSingle()
        : { data: null };

      if (planoId && !plano) {
        return NextResponse.json({ error: "plano_invalido" }, { status: 400 });
      }

      // Trocar de plano leva o limite de assentos dele junto — é a mesma
      // regra que a listagem já aplicava.
      const { error } = await db
        .from("workspace")
        .update({
          plan_id: planoId,
          ...(plano ? { seat_limit: plano.max_users } : {}),
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }

      resumo = `mudou o plano de "${empresa.name}" para ${plano?.name ?? "nenhum"}`;
      detalhes = { ...detalhes, de: empresa.plan_id, para: planoId };
      break;
    }

    case "alterar_assentos": {
      const assentos = Math.max(1, Math.floor(Number(corpo.valor)));
      if (!Number.isFinite(assentos)) {
        return NextResponse.json({ error: "valor_invalido" }, { status: 400 });
      }
      const { error } = await db
        .from("workspace")
        .update({ seat_limit: assentos })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `mudou os assentos de "${empresa.name}" de ${empresa.seat_limit} para ${assentos}`;
      detalhes = { ...detalhes, de: empresa.seat_limit, para: assentos };
      break;
    }

    case "conceder_acesso": {
      const dias = Math.max(1, Math.floor(Number(corpo.valor)));
      if (!Number.isFinite(dias)) {
        return NextResponse.json({ error: "valor_invalido" }, { status: 400 });
      }

      // Plano vitalício não tem prazo para estender (0085). O gatilho no
      // banco zeraria a data de qualquer jeito; recusar aqui é o que
      // transforma um "não aconteceu nada" numa frase que explica por quê.
      // Para dar prazo a esta empresa, tire-a do vitalício antes.
      if (empresa.plan_id) {
        const { data: plano } = await db
          .from("billing_plan")
          .select("vitalicio")
          .eq("id", empresa.plan_id)
          .maybeSingle();
        if (plano?.vitalicio) {
          return NextResponse.json(
            {
              error: "plano_vitalicio",
              message:
                "Esta empresa está no plano vitalício: o acesso dela não " +
                "vence. Para dar prazo, troque o plano antes.",
            },
            { status: 409 }
          );
        }
      }
      // Conta a partir de HOJE quando o acesso já venceu, e a partir do
      // vencimento quando ainda está valendo: renovar quem tem 20 dias pela
      // frente não pode encurtar o prazo dele.
      const agora = Date.now();
      const atual = empresa.access_expires_at
        ? new Date(empresa.access_expires_at).getTime()
        : agora;
      const base = Math.max(agora, atual);
      const novo = new Date(base + dias * 86_400_000).toISOString();

      const { error } = await db
        .from("workspace")
        .update({ access_expires_at: novo })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `estendeu o acesso de "${empresa.name}" por ${dias} dias`;
      detalhes = { ...detalhes, de: empresa.access_expires_at, para: novo };
      break;
    }

    case "encerrar_teste":
    case "iniciar_teste": {
      const emTeste = acao === "iniciar_teste";
      const { error } = await db
        .from("workspace")
        .update({ trial: emTeste })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `${emTeste ? "colocou em teste" : "encerrou o teste de"} "${empresa.name}"`;
      break;
    }

    case "editar_contato": {
      // Dois campos num valor só, separados por "|": a carga das outras ações
      // é escalar, e criar um segundo campo no corpo só para esta faria toda
      // ação futura carregar o peso dele.
      const bruto = String(corpo.valor ?? "");
      const [emailBruto, telefoneBruto] = bruto.split("|");
      const email = (emailBruto ?? "").trim();
      const telefone = (telefoneBruto ?? "").trim();

      // Vazio limpa o campo; preenchido precisa parecer e-mail. Um endereço
      // errado aqui é fatura que nunca chega e ninguém descobre.
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "email_invalido", message: "E-mail inválido" },
          { status: 400 }
        );
      }

      const { error } = await db
        .from("workspace")
        .update({
          contact_email: email || null,
          contact_phone: telefone || null,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `alterou o contato de cobrança de "${empresa.name}"`;
      // O contato NÃO vai para os detalhes: é dado pessoal, e a auditoria é
      // lida por mais gente e guardada por mais tempo do que a alteração dura.
      detalhes = { empresa: empresa.name } as Json;
      break;
    }

    case "suspender":
    case "reativar": {
      const suspender = acao === "suspender";
      const { error } = await db
        .from("workspace")
        .update({ suspended: suspender })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `${suspender ? "suspendeu" : "reativou"} a empresa "${empresa.name}"`;
      break;
    }

    case "excluir": {
      // Exclusão LÓGICA: some para o cliente, fica restaurável por 30 dias.
      // Suspender junto é o que tira a equipe de dentro na hora — sem isso,
      // quem já está com sessão aberta continuaria trabalhando.
      const { error } = await db
        .from("workspace")
        .update({ deleted_at: new Date().toISOString(), suspended: true })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `excluiu a empresa "${empresa.name}" (restaurável por ${DIAS_ATE_REMOCAO_FISICA} dias)`;
      break;
    }

    case "restaurar": {
      const { error } = await db
        .from("workspace")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `restaurou a empresa "${empresa.name}"`;
      break;
    }

    case "anotar": {
      const texto = String(corpo.valor ?? "").trim();
      if (texto.length === 0) {
        return NextResponse.json(
          { error: "valor_invalido", message: "Escreva a observação" },
          { status: 400 }
        );
      }
      const { error } = await db
        .from("admin_note")
        .insert({ workspace_id: id, autor: admin.email, corpo: texto });
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `anotou uma observação sobre "${empresa.name}"`;
      // A nota NÃO vai para os detalhes da auditoria: ela já está guardada
      // em admin_note, e duplicar texto livre em dois lugares é como as
      // duas versões passam a divergir.
      detalhes = { empresa: empresa.name };
      break;
    }
  }

  await registrarEventoDePlataforma({
    autor: admin.email,
    acao: VERBO[acao],
    entidade: "workspace",
    entidadeId: id,
    resumo,
    detalhes,
  });

  return NextResponse.json({ ok: true });
}
