// Ponto do setor + nome (design 8.2). Nome sempre visível (independe de cor).
export function SectorDot({ color, name }: { color: string; name: string }) {
  return (
    <span className="text-fg-muted inline-flex items-center gap-1 text-[length:var(--text-caption-size)]">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      {name}
    </span>
  );
}
