import { Suspense } from "react";

import { ListView } from "@/components/task/ListView";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * O `Suspense` é exigência do `useSearchParams`, que a Lista passou a usar
 * para abrir já filtrada quando alguém chega de um número do relatório.
 */
export default function ListaPage() {
  return (
    <Suspense fallback={<Skeleton variant="block" className="h-96" />}>
      <ListView />
    </Suspense>
  );
}
