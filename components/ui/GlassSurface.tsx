import type { ReactNode } from "react";

/**
 * Classe de vidro líquido. Existe como função porque boa parte dos usos é
 * em componentes do Radix (Content de menu/popover/diálogo), que recebem
 * `className` e não aceitam um wrapper por fora sem quebrar o posicionamento.
 *
 * Uso SELETIVO (direção visual): casca, busca, botão primário, item ativo da
 * navegação, tooltip, menus, popovers, modais e hover da agenda. Card de dado
 * permanece sólido — legibilidade vem antes do efeito.
 */
export function glassSurface(strong = false): string {
  return strong ? "tf-glass-strong" : "tf-glass";
}

export function GlassSurface({
  strong = false,
  className,
  children,
}: {
  strong?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${glassSurface(strong)} ${className ?? ""}`}>
      {children}
    </div>
  );
}
