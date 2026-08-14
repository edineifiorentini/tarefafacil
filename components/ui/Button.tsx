import { IconLoader2 } from "@tabler/icons-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { IconComponent } from "./types";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)]",
  secondary: "border border-line bg-card text-fg hover:bg-sunken",
  ghost: "text-fg-secondary hover:bg-sunken hover:text-fg",
  danger:
    "bg-[var(--button-danger-bg)] text-[var(--button-danger-fg)] hover:bg-[var(--button-danger-bg-hover)] active:bg-[var(--button-danger-bg-active)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[length:var(--text-small-size)]",
  md: "h-10 px-4 text-[length:var(--text-small-size)]",
};

export function Button({
  variant = "secondary",
  size = "md",
  leadingIcon: Leading,
  trailingIcon: Trailing,
  isLoading = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      {...rest}
    >
      {isLoading ? (
        <IconLoader2 size={iconSize} stroke={1.5} className="animate-spin" />
      ) : Leading ? (
        <Leading size={iconSize} stroke={1.5} />
      ) : null}
      {children}
      {!isLoading && Trailing ? (
        <Trailing size={iconSize} stroke={1.5} />
      ) : null}
    </button>
  );
}
