export interface ProgressBarProps {
  /** 0 a 100. */
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-sunken ${className ?? ""}`}
    >
      <div
        className="h-full rounded-full bg-[var(--fill-brand)]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
