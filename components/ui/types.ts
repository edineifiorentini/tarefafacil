import type { ComponentType } from "react";

// Assinatura dos ícones Tabler usados nos átomos (aceita aria para decoração).
export type IconComponent = ComponentType<{
  size?: number | string;
  stroke?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}>;
