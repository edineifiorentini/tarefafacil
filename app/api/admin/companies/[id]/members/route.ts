import { NextResponse } from "next/server";

import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import { requirePlatformAdmin } from "@/lib/admin/admin";
import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import {
  ACOES_DE_MEMBRO,
  deixariaSemDono,
  ehAcaoDeMembro,
  ehPapelAtribuivel,
  PAPEL_LABEL,
  type AcaoDeMembro,
} from "@/lib/admin/members";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditAction, Json } from "@/types/database";

/**
 * Ações sobre um membro de empresa (especificação 10.4).
 *
 * As mesmas três regras da rota de empresa: autorização aqui, motivo
 * validado aqui, auditoria depois do sucesso.
 *
 * Mais uma, própria deste arquivo: **nenhuma ação pode deixar a empresa sem
 * dono**. Uma empresa sem dono é um beco — `owner_user_id` fica órfão, a
 * cobrança perde o responsável e ninguém tem permissão para convidar alguém
 * de volta. A trava é conferida contra o banco, não contra o que o cliente
 * mandou.
 */

/** Bloqueio de conta: cem anos. O GoTrue quer uma duração, não um booleano. */
const BLOQUEIO_LONGO = "876000h";

const VERBO: Record<AcaoDeMembro, AuditAction> = {
  alterar_papel: "alterou",
  remover: "excluiu",
  transferir_propriedade: "alterou",
  bloquear: "alterou",
  desbloquear: "alterou",
  link_de_senha: "criou",
};

type Corpo = {
  acao?: string;
  motivo?: string;
  /** Usuário alvo. */
  userId?: string;
  /** Papel novo, para `alterar_papel`. */
  papel?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: workspaceId } = await params;

  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!ehAcaoDeMembro(corpo.acao)) {
    return NextResponse.json({ error: "acao_invalida" }, { status: 400 });
  }
  const acao = corpo.acao;

  if (!corpo.userId) {
    return NextResponse.json({ error: "membro_ausente" }, { status: 400 });
  }

  // Motivo obrigatório em toda ação de membro. A checagem é escrita aqui e
  // não reaproveita `validarMotivo`, que lê o catálogo de EMPRESA — chamar
  // aquela função com uma ação de membro passaria direto, porque a ação não
  // existe lá e o catálogo devolveria "não exige motivo".
  if (ACOES_DE_MEMBRO[acao].exigeMotivo) {
    const limpo = (corpo.motivo ?? "").trim();
    if (limpo.length === 0) {
      return NextResponse.json(
        { error: "motivo_invalido", message: "Escreva o motivo desta ação" },
        { status: 400 }
      );
    }
    if (limpo.length < MOTIVO_MINIMO) {
      return NextResponse.json(
        {
          error: "motivo_invalido",
          message: `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`,
        },
        { status: 400 }
      );
    }
  }

  const db = createAdminClient();

  const [empresaRes, membrosRes, perfilRes] = await Promise.all([
    db
      .from("workspace")
      .select("id, name, owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle(),
    db
      .from("workspace_member")
      .select("user_id, role, status")
      .eq("workspace_id", workspaceId),
    db
      .from("app_user")
      .select("id, email, display_name")
      .eq("id", corpo.userId)
      .maybeSingle(),
  ]);

  const empresa = empresaRes.data;
  if (!empresa) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const membros = (membrosRes.data ?? []) as {
    user_id: string;
    role: string;
    status: string;
  }[];
  const alvo = membros.find((m) => m.user_id === corpo.userId);
  if (!alvo) {
    return NextResponse.json(
      { error: "membro_nao_encontrado" },
      { status: 404 }
    );
  }

  const perfil = perfilRes.data as {
    id: string;
    email: string;
    display_name: string | null;
  } | null;
  const nomeDoAlvo = perfil?.display_name ?? perfil?.email ?? "a pessoa";

  // A trava do dono, conferida contra o banco.
  const donos = membros.filter((m) => m.role === "owner").length;
  if (deixariaSemDono(acao, alvo.role, donos)) {
    return NextResponse.json(
      {
        error: "sem_dono",
        message:
          "Esta é a única pessoa dona da empresa. Transfira a propriedade antes.",
      },
      { status: 409 }
    );
  }

  const motivo = (corpo.motivo ?? "").trim();
  let resumo = "";
  let detalhes: Json = {
    motivo,
    empresa: empresa.name,
    membro: perfil?.email ?? corpo.userId,
  };
  let extra: Json | null = null;

  switch (acao) {
    case "alterar_papel": {
      if (!ehPapelAtribuivel(corpo.papel)) {
        return NextResponse.json(
          {
            error: "papel_invalido",
            message:
              "Escolha administrador, membro ou leitor. Dono se define transferindo a propriedade.",
          },
          { status: 400 }
        );
      }
      const { error } = await db
        .from("workspace_member")
        .update({ role: corpo.papel })
        .eq("workspace_id", workspaceId)
        .eq("user_id", corpo.userId);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `mudou o papel de ${nomeDoAlvo} em "${empresa.name}" de ${PAPEL_LABEL[alvo.role] ?? alvo.role} para ${PAPEL_LABEL[corpo.papel]}`;
      detalhes = {
        ...(detalhes as object),
        de: alvo.role,
        para: corpo.papel,
      } as Json;
      break;
    }

    case "remover": {
      const { error } = await db
        .from("workspace_member")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", corpo.userId);
      if (error) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }
      resumo = `removeu ${nomeDoAlvo} da empresa "${empresa.name}"`;
      break;
    }

    case "transferir_propriedade": {
      if (alvo.role === "owner") {
        return NextResponse.json(
          { error: "ja_e_dono", message: "Esta pessoa já é a dona da empresa" },
          { status: 409 }
        );
      }
      if (alvo.status !== "active") {
        return NextResponse.json(
          {
            error: "convite_pendente",
            message: "Só quem já aceitou o convite pode receber a propriedade",
          },
          { status: 409 }
        );
      }

      // Ordem importa: promove o novo dono ANTES de rebaixar o antigo. Se a
      // segunda escrita falhar, a empresa fica com dois donos — chato, mas
      // consertável pela própria tela. Na ordem inversa, uma falha deixaria
      // a empresa sem dono nenhum, que é o estado do qual não se sai.
      const { error: erroPromover } = await db
        .from("workspace_member")
        .update({ role: "owner" })
        .eq("workspace_id", workspaceId)
        .eq("user_id", corpo.userId);
      if (erroPromover) {
        return NextResponse.json({ error: "falhou" }, { status: 500 });
      }

      const donoAntigo = empresa.owner_user_id;
      if (donoAntigo && donoAntigo !== corpo.userId) {
        await db
          .from("workspace_member")
          .update({ role: "admin" })
          .eq("workspace_id", workspaceId)
          .eq("user_id", donoAntigo);
      }

      await db
        .from("workspace")
        .update({ owner_user_id: corpo.userId })
        .eq("id", workspaceId);

      resumo = `transferiu a propriedade de "${empresa.name}" para ${nomeDoAlvo}`;
      detalhes = { ...(detalhes as object), donoAnterior: donoAntigo } as Json;
      break;
    }

    case "bloquear":
    case "desbloquear": {
      const bloquear = acao === "bloquear";
      const { error } = await db.auth.admin.updateUserById(corpo.userId, {
        ban_duration: bloquear ? BLOQUEIO_LONGO : "none",
      });
      if (error) {
        return NextResponse.json(
          { error: "falhou", message: error.message },
          { status: 500 }
        );
      }
      resumo = `${bloquear ? "bloqueou" : "desbloqueou"} a conta de ${nomeDoAlvo}`;
      break;
    }

    case "link_de_senha": {
      if (!perfil?.email) {
        return NextResponse.json(
          { error: "sem_email", message: "A pessoa não tem e-mail cadastrado" },
          { status: 409 }
        );
      }
      const { data, error } = await db.auth.admin.generateLink({
        type: "recovery",
        email: perfil.email,
      });
      if (error || !data?.properties?.action_link) {
        return NextResponse.json(
          {
            error: "falhou",
            message: error?.message ?? "Não foi possível gerar o link",
          },
          { status: 500 }
        );
      }
      // O link NÃO entra na auditoria: quem tem o link define a senha, e log
      // é lido por mais gente e guardado por mais tempo do que a ação dura.
      // Registra-se que um link foi gerado, para quem e por quê.
      resumo = `gerou um link de redefinição de senha para ${nomeDoAlvo}`;
      extra = { link: data.properties.action_link };
      break;
    }
  }

  await registrarEventoDePlataforma({
    autor: admin.email,
    acao: VERBO[acao],
    entidade: "workspace_member",
    entidadeId: workspaceId,
    resumo,
    detalhes,
  });

  return NextResponse.json({ ok: true, ...(extra as object | null) });
}
