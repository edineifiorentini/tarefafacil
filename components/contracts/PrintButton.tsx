"use client";

import { IconPrinter } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

// Fica fora da folha impressa (print:hidden) — aciona o diálogo nativo do
// navegador, que também permite "Salvar como PDF".
export function PrintButton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl justify-end px-10 py-4 print:hidden">
      <Button
        variant="primary"
        leadingIcon={IconPrinter}
        onClick={() => window.print()}
      >
        Imprimir / salvar em PDF
      </Button>
    </div>
  );
}
