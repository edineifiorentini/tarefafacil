import type { InputHTMLAttributes } from "react";

type Size = "sm" | "md";

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: Size;
  error?: boolean;
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[length:var(--text-small-size)]",
  md: "h-10 px-3 text-[length:var(--text-body-size)]",
};

export function TextInput({
  size = "md",
  error = false,
  className,
  ...rest
}: TextInputProps) {
  return (
    <input
      aria-invalid={error || undefined}
      className={`w-full rounded-sm border bg-card text-fg transition-colors [transition-duration:var(--dur-fast)] placeholder:text-fg-muted disabled:cursor-not-allowed disabled:opacity-60 ${
        error ? "border-overdue" : "border-line hover:border-line-strong"
      } ${sizes[size]} ${className ?? ""}`}
      {...rest}
    />
  );
}
