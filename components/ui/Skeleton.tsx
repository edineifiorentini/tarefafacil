type Variant = "text" | "block";

/**
 * Placeholder de carregamento. O brilho atravessa da esquerda para a direita
 * (background-position, sem reflow) e é zerado por prefers-reduced-motion.
 */
export function Skeleton({
  variant = "text",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const shape = variant === "text" ? "h-4 rounded-sm" : "rounded-md";
  return (
    <div
      aria-hidden
      className={`bg-sunken w-full ${shape} ${className ?? ""}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 20%, var(--surface-subtle) 50%, transparent 80%)",
        backgroundSize: "200% 100%",
        animation: "tf-shimmer 1.4s linear infinite",
      }}
    />
  );
}

/**
 * Esqueleto de um cartão do painel — mantém a altura da grade estável
 * enquanto os dados chegam, evitando o salto de layout.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`border-line bg-card rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)] ${className ?? ""}`}
    >
      <div className="flex gap-4">
        <Skeleton variant="block" className="h-11 w-11 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
    </div>
  );
}
