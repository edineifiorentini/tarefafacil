import { Suspense } from "react";

import { SearchView } from "@/components/search/SearchView";

export default function BuscaPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
