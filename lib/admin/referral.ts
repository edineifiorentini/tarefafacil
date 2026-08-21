import { createAdminClient } from "@/lib/supabase/admin";

/** Cookie que carrega o código do afiliado entre o clique e o cadastro. */
export const REF_COOKIE = "tf_ref";

/** 90 dias: prazo usual de indicação. */
export const REF_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

/**
 * Liga a empresa recém-criada ao afiliado que a indicou.
 *
 * Só atribui workspace SEM afiliado e RECÉM-CRIADO. As duas condições
 * importam: sem a primeira, um clique num link de indicação reatribuiria um
 * cliente antigo; sem a segunda, o cookie que sobrou de meses atrás daria a
 * comissão a quem não trouxe ninguém.
 *
 * O percentual é copiado para a empresa. É o acordo do dia da indicação —
 * mudar a tabela do afiliado depois não mexe em quem ele já trouxe.
 */
export async function atribuirIndicacao(
  userId: string,
  code: string
): Promise<void> {
  const normalizado = code.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,32}$/.test(normalizado)) return;

  const db = createAdminClient();
  const { data: afiliado } = await db
    .from("affiliate")
    .select("id, commission_percent")
    .eq("code", normalizado)
    .eq("active", true)
    .maybeSingle();
  if (!afiliado) return;

  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db
    .from("workspace")
    .update({
      affiliate_id: afiliado.id,
      affiliate_percent: afiliado.commission_percent,
    })
    .eq("owner_user_id", userId)
    .is("affiliate_id", null)
    .gte("created_at", umDiaAtras);
}
