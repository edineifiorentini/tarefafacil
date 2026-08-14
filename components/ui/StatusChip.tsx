/**
 * Chip de situação. Duas formas:
 *  - `solid`: fundo pastel + texto na cor (setor, categoria)
 *  - `dot`:   bolinha colorida + rótulo neutro (estado da agenda)
 *
 * Em ambas o rótulo textual é obrigatório: a situação nunca é comunicada
 * apenas por cor.
 */
export function StatusChip({
  label,
  tone,
  variant = "solid",
}: {
  label: string;
  /** Token de cor (`var(--tone-blue)`), nunca hex literal. */
  tone: string;
  variant?: "solid" | "dot";
}) {
  if (variant === "dot") {
    return (
      <span className="text-fg-secondary inline-flex items-center gap-1.5 text-[length:var(--text-caption-size)] whitespace-nowrap">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: tone }}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-xs px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap"
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 12%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
