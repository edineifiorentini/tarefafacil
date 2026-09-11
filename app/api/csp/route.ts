import { NextResponse } from "next/server";

import { reduzirViolacao } from "@/lib/seguranca/csp";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Recebe as violações da CSP em modo relatório.
 *
 * ROTA PÚBLICA por definição: quem reporta é o NAVEGADOR de quem visita, e
 * ele não manda sessão nenhuma junto. Também é uma rota que qualquer um na
 * internet pode chamar — então ela é escrita como se fosse alvo, e não como
 * se recebesse só o que o Chrome manda:
 *
 *   1. corpo grande é recusado antes de ser lido;
 *   2. o que não é uma violação reconhecível é descartado em silêncio;
 *   3. o que sobra é REDUZIDO (só origem e formato de rota — nunca o
 *      endereço em claro, que no TAFLOW carrega token) e SOMADO num
 *      contador, então avisos repetidos custam um `update`, não uma linha;
 *   4. a resposta é sempre 204, sem contar o que aconteceu lá dentro.
 *
 * Responder 204 mesmo para lixo é de propósito: o navegador não faz nada
 * com o código de resposta, e devolver erro só entregaria a quem está
 * sondando qual formato o servidor entende.
 */

export const dynamic = "force-dynamic";

/** Aviso de CSP é pequeno. Acima disto é abuso, não relatório. */
const LIMITE_BYTES = 16_384;

const semConteudo = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  const tamanho = Number(request.headers.get("content-length") ?? "0");
  if (tamanho > LIMITE_BYTES) return semConteudo();

  let cru: string;
  try {
    cru = await request.text();
  } catch {
    return semConteudo();
  }
  // O cabeçalho pode mentir ou faltar; o texto lido, não.
  if (cru.length > LIMITE_BYTES) return semConteudo();

  let corpo: unknown;
  try {
    corpo = JSON.parse(cru);
  } catch {
    return semConteudo();
  }

  const violacao = reduzirViolacao(corpo);
  if (!violacao) return semConteudo();

  const db = createAdminClient();
  const { error } = await db.rpc("registrar_csp", {
    p_directive: violacao.directive,
    p_origem: violacao.origem,
    p_rota: violacao.rota,
  });

  // Falha de banco não vira erro para o navegador: ele reenviaria, e um
  // relatório não vale uma fila de tentativas. Fica no log, para quem
  // estiver acompanhando a medição.
  if (error) {
    console.warn("[csp] não foi possível somar a violação:", error.message);
  }

  return semConteudo();
}
