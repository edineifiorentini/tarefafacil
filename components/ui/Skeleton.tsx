type Variant = "text" | "block";

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
      className={`w-full animate-pulse bg-sunken ${shape} ${className ?? ""}`}
    />
  );
}
