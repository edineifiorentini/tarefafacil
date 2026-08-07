import type { ButtonHTMLAttributes } from "react";

import type { IconComponent } from "./types";

type Variant = "ghost" | "subtle";
type Size = "sm" | "md";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  icon: IconComponent;
  /** Rótulo acessível obrigatório (não há texto visível). */
  label: string;
  variant?: Variant;
  size?: Size;
  type?: "button" | "submit" | "reset";
}

const variants: Record<Variant, string> = {
  ghost: "text-fg-secondary hover:bg-sunken hover:text-fg",
  subtle: "bg-sunken text-fg-secondary hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

export function IconButton({
  icon: Glyph,
  label,
  variant = "ghost",
  size = "md",
  type = "button",
  className,
  disabled,
  ...rest
}: IconButtonProps) {
  const iconSize = size === "sm" ? 16 : 20;
  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      {...rest}
    >
      <Glyph size={iconSize} stroke={1.5} />
    </button>
  );
}
