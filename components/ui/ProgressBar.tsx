export interface ProgressBarProps {
  /** 0 a 100. */
  value: number;
  label?: string;
  /** Token de cor do preenchimento. Sem valor, usa a tinta da marca. */
  color?: string;
  /** Espessura fina (4px) para listas densas; padrão 8px. */
  thin?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  color,
  thin = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`${thin ? "h-1.5" : "h-2"} bg-track w-full overflow-hidden rounded-full ${className ?? ""}`}
    >
      <div
        className="h-full rounded-full transition-[width] [transition-duration:var(--dur-slow)] [transition-timing-function:var(--ease-out)]"
        style={{
          width: `${clamped}%`,
          background: color ?? "var(--fill-brand)",
        }}
      />
    </div>
  );
}
