"use client";

import { renderTemplate, type TemplateContext } from "@/lib/contracts/template";

/**
 * Prévia do texto do contrato. Recebe blocos já resolvidos e monta com
 * elementos React — nunca dangerouslySetInnerHTML, porque o modelo é texto
 * e não HTML (ver lib/contracts/template.ts).
 */
export function ContractPreview({
  body,
  context,
  emptyMessage = "Escolha um modelo para ver o texto do contrato",
}: {
  body: string | null;
  context: TemplateContext;
  emptyMessage?: string;
}) {
  if (!body) {
    return (
      <p className="text-fg-secondary py-6 text-center text-[length:var(--text-small-size)]">
        {emptyMessage}
      </p>
    );
  }

  const blocks = renderTemplate(body, context);

  return (
    <div className="border-line bg-card flex flex-col gap-3 rounded-md border p-4">
      {blocks.map((block, index) =>
        block.kind === "heading" ? (
          <h3
            key={`${block.kind}-${index}`}
            className="text-fg text-[length:var(--text-small-size)] font-semibold tracking-wide uppercase"
          >
            {block.text}
          </h3>
        ) : (
          <p
            key={`${block.kind}-${index}`}
            className="text-fg-secondary text-[length:var(--text-small-size)] whitespace-pre-wrap"
          >
            {block.text}
          </p>
        )
      )}
    </div>
  );
}
