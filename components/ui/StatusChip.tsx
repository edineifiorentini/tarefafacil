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
  labelClassName,
}: {
  label: string;
  /** Token de cor (`var(--tone-blue)`), nunca hex literal. */
  tone: string;
  variant?: "solid" | "dot";
  /**
   * Classes do rótulo na forma `dot`. Serve para escondê-lo visualmente em
   * espaço apertado (`sr-only`) sem perder o texto para leitor de tela — a
   * bolinha continua, e cor sozinha nunca comunica situação.
   */
  labelClassName?: string;
}) {
  if (variant === "dot") {
    return (
      <span className="text-fg-secondary inline-flex items-center gap-1.5 text-[length:var(--text-caption-size)] whitespace-nowrap">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: tone }}
        />
        <span className={labelClassName}>{label}</span>
      </span>
    );
  }

  return (
    <span
      // Nome de setor é conteúdo do usuário e pode ser longo: nunca quebra em
      // duas linhas, mas corta com reticências se o pai apertar.
      className="inline-flex max-w-full items-center overflow-hidden rounded-xs px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium text-ellipsis whitespace-nowrap"
      title={label}
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 12%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
