import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/shell/AdminShell";
import { Providers } from "@/components/providers";
import { requirePlatformAdmin } from "@/lib/admin/admin";

/**
 * O painel da plataforma FICA FORA do grupo `(app)`.
 *
 * Antes ele morava dentro, e por isso herdava a casca do cliente: barra
 * lateral com os setores da SUA empresa, atalhos do quadro, painel de
 * detalhe de demanda. A especificação (4) proíbe misturar os dois ambientes,
 * e havia um efeito prático pior — o layout de `(app)` exige que o usuário
 * tenha um workspace e barra quem está com acesso vencido. Um administrador
 * da plataforma sem empresa própria não conseguia abrir o painel.
 *
 * Aqui a única exigência é ser admin da plataforma. A autorização é do
 * servidor: esconder o item no menu nunca foi controle de acesso.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requirePlatformAdmin();
  if (!admin) redirect("/hoje");

  // `Providers` traz QueryClient e Toast. Sem ele, todo componente que usa
  // `useQuery` — Empresas, Planos, Afiliados — quebra com 500 no servidor.
  // Antes vinha de graça do layout de `(app)`; aqui precisa ser explícito.
  return (
    <Providers>
      <AdminShell email={admin.email}>{children}</AdminShell>
    </Providers>
  );
}
