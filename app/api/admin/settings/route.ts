import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import {
  POLITICA_PADRAO,
  validarPolitica,
  type PoliticaDaPlataforma,
} from "@/lib/admin/politica";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ajustes da plataforma inteira. Uma linha só na tabela (0061, 0088).
 *
 * Roda com a chave secreta porque `platform_setting` não tem policy
 * nenhuma: quem decide se a porta está aberta não pode ser quem está
 * tentando entrar.
 *
 * **O PATCH aceita atualização PARCIAL, e isso é decisão.** Dois cartões
 * editam esta linha — o interruptor de cadastros e a política de números.
 * Se cada um mandasse o objeto inteiro, salvar num deles gravaria por cima
 * do que o outro tivesse acabado de mudar, e a última tela a salvar
 * venceria em silêncio. Mesclando com o que está no banco, cada cartão
 * escreve só o que ele conhece.
 */

const COLUNAS = "signups_enabled, trial_days, initial_seats, audit_keep_days";

type Linha = {
  signups_enabled: boolean;
  trial_days: number;
  initial_seats: number;
  audit_keep_days: number;
};

function paraPolitica(linha: Linha | null): PoliticaDaPlataforma {
  if (!linha) return POLITICA_PADRAO;
  return {
    cadastrosAbertos: linha.signups_enabled,
    diasDeTeste: linha.trial_days,
    assentosIniciais: linha.initial_seats,
    diasDeAuditoria: linha.audit_keep_days,
  };
}

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("platform_setting")
    .select(`${COLUNAS}, updated_at`)
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const linha = data as (Linha & { updated_at: string }) | null;
  const politica = paraPolitica(linha);

  return NextResponse.json({
    // O nome antigo continua saindo: o cartão de cadastros já o consome, e
    // renomear campo de resposta quebraria a tela sem melhorar nada.
    signups_enabled: politica.cadastrosAbertos,
    trial_days: politica.diasDeTeste,
    initial_seats: politica.assentosIniciais,
    audit_keep_days: politica.diasDeAuditoria,
    updated_at: linha?.updated_at ?? null,
  });
}

export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: atual, error: erroLeitura } = await db
    .from("platform_setting")
    .select(COLUNAS)
    .limit(1)
    .maybeSingle();
  if (erroLeitura) {
    return NextResponse.json({ error: erroLeitura.message }, { status: 500 });
  }

  const base = paraPolitica(atual as Linha | null);
  const mesclado = {
    cadastrosAbertos: body.signups_enabled ?? base.cadastrosAbertos,
    diasDeTeste: body.trial_days ?? base.diasDeTeste,
    assentosIniciais: body.initial_seats ?? base.assentosIniciais,
    diasDeAuditoria: body.audit_keep_days ?? base.diasDeAuditoria,
  };

  // Valida o resultado FINAL, e não só o que veio: é ele que vai para o
  // banco, e é ele que precisa respeitar os `check` da 0088.
  const veredito = validarPolitica(mesclado);
  if (!veredito.ok) {
    return NextResponse.json(
      { error: "invalido", mensagem: veredito.erro },
      { status: 400 }
    );
  }
  const p = veredito.valor;

  const { error } = await db
    .from("platform_setting")
    .update({
      signups_enabled: p.cadastrosAbertos,
      trial_days: p.diasDeTeste,
      initial_seats: p.assentosIniciais,
      audit_keep_days: p.diasDeAuditoria,
    })
    .eq("id", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    signups_enabled: p.cadastrosAbertos,
    trial_days: p.diasDeTeste,
    initial_seats: p.assentosIniciais,
    audit_keep_days: p.diasDeAuditoria,
  });
}
