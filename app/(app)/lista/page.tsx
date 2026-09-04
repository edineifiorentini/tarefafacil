import { Suspense } from "react";

import { ListView } from "@/components/task/ListView";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Lista — TAFLOW" };

/**
 * O `Suspense` é exigência do `useSearchParams`, que a Lista usa para
 * guardar o recorte na URL — busca, visão, filtros, agrupamento e
 * ordenação. É o que faz voltar do detalhe devolver a mesma lista.
 *
 * O cabeçalho (título, subtítulo e contagem) mora DENTRO da view, não
 * aqui: a contagem precisa dizer quantas demandas o recorte atual tem, e
 * numa página de servidor ela seria o total do workspace — um número ao
 * lado de uma lista filtrada faz quem lê procurar as que faltam.
 */
export default function ListaPage() {
  return (
    <Suspense fallback={<Skeleton variant="block" className="h-96" />}>
      <ListView />
    </Suspense>
  );
}
