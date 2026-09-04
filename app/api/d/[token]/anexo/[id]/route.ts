import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Entrega um entregável pelo link público (0083).
 *
 * ESTA ROTA É FRONTEIRA DE SEGURANÇA. Ela roda com a chave secreta, sem
 * sessão, e recebe dois valores de quem está do lado de fora. Cada condição
 * abaixo existe porque a sua ausência entregaria um arquivo que não devia
 * sair — o contrato, a planilha de custo, o anexo de outro cliente.
 *
 * As cinco travas, na ordem:
 *
 * 1. formato do token, antes de tocar no banco;
 * 2. o link existe, não foi revogado e não expirou;
 * 3. o anexo pertence À DEMANDA DAQUELE LINK. Sem isto, qualquer token
 *    válido buscaria qualquer anexo do sistema pelo id — o furo clássico
 *    de referência direta a objeto;
 * 4. o anexo está marcado `entregavel`. Publicar é ato explícito;
 * 5. a empresa do anexo é a mesma do link. Cinto e suspensório, igual ao
 *    que `readSharedTask` faz com a demanda.
 *
 * O que sai daqui é um REDIRECIONAMENTO para uma URL assinada de cinco
 * minutos. A chave do storage nunca chega ao navegador do visitante, e o
 * endereço que ele recebe morre sozinho.
 */

/** Mesma janela usada no app para anexo interno. */
const VALIDADE_SEGUNDOS = 300;

const BUCKET = "attachments";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;

  // 1. Formato. Token torto nem chega ao banco.
  if (!/^[0-9a-f]{32,80}$/.test(token)) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  const db = createAdminClient();

  // 2. O link vale?
  const { data: link } = await db
    .from("share_link")
    .select("entity_id, workspace_id, revoked_at, expires_at, entity_type")
    .eq("token", token)
    .maybeSingle();

  if (
    !link ||
    link.entity_type !== "task" ||
    link.revoked_at ||
    new Date(link.expires_at) <= new Date()
  ) {
    // Uma resposta só para todos os casos: distinguir "revogado" de
    // "inexistente" conta a quem está tentando qual token existiu.
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // 3, 4 e 5 numa consulta: o anexo precisa ser DESTA demanda, estar
  // marcado, e pertencer à MESMA empresa do link.
  const { data: anexo } = await db
    .from("attachment")
    .select("storage_key, filename, mime_type, workspace_id, purged_at")
    .eq("id", id)
    .eq("task_id", link.entity_id)
    .eq("entregavel", true)
    .eq("kind", "file")
    .maybeSingle();

  if (
    !anexo ||
    !anexo.storage_key ||
    anexo.workspace_id !== link.workspace_id
  ) {
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  // 6. O arquivo já cumpriu o prazo no servidor (0086)?
  //
  // 410 e não 404: o recurso EXISTIU e não existe mais, e a diferença
  // importa para quem está do outro lado. Assinar a URL aqui devolveria um
  // erro cru do storage, que não explica nada.
  if (anexo.purged_at) {
    return NextResponse.json(
      { erro: "retirado", retiradoEm: anexo.purged_at },
      { status: 410 }
    );
  }

  const { data: assinada, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(anexo.storage_key, VALIDADE_SEGUNDOS);

  if (error || !assinada?.signedUrl) {
    return NextResponse.json({ erro: "indisponível" }, { status: 502 });
  }

  // 302 e não 200 com o corpo: deixa o arquivo sair pelo storage, sem passar
  // pelo servidor da aplicação. E `no-store` para o endereço assinado não
  // ficar guardado em cache intermediário depois de expirar.
  return NextResponse.redirect(assinada.signedUrl, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}
