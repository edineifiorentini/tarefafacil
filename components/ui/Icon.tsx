import type { IconComponent } from "./types";

export interface IconProps {
  icon: IconComponent;
  size?: number;
  /** Se informado, o ícone é anunciado; senão, é decorativo (aria-hidden). */
  label?: string;
  className?: string;
}

// Wrapper padrão: Tabler outline, traço 1.5 (design 8.1).
export function Icon({ icon: Cmp, size = 20, label, className }: IconProps) {
  return (
    <Cmp
      size={size}
      stroke={1.5}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
