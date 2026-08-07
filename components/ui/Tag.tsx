import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type TagColor =
  | "neutral"
  | "violeta"
  | "azul"
  | "coral"
  | "rosa"
  | "grafite";

export interface TagProps {
  children: ReactNode;
  color?: TagColor;
  onRemove?: () => void;
}

export function Tag({ children, color = "neutral", onRemove }: TagProps) {
  const colored = color !== "neutral";
  const style = colored
    ? {
        background: `var(--sector-${color}-fill)`,
        color: `var(--sector-${color}-text)`,
      }
    : undefined;

  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] ${
        colored ? "" : "bg-sunken text-fg-secondary"
      }`}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover tag"
          className="inline-flex items-center justify-center rounded-full transition-opacity [transition-duration:var(--dur-fast)] hover:opacity-70"
        >
          <IconX size={12} stroke={1.5} />
        </button>
      ) : null}
    </span>
  );
}
