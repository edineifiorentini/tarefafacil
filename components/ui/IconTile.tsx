import type { IconComponent } from "./types";

type Size = "sm" | "md";

const sizes: Record<Size, { box: string; icon: number }> = {
  sm: { box: "h-8 w-8 rounded-sm", icon: 16 },
  md: { box: "h-11 w-11 rounded-md", icon: 20 },
};

/**
 * Quadrado arredondado com tinta suave da cor do dado e o ícone na mesma cor.
 * `tone` é sempre um token (`var(--chart-1)`) — nunca hex literal no
 * componente. O fundo sai por color-mix, então adapta ao tema sozinho.
 */
export function IconTile({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: IconComponent;
  tone: string;
  size?: Size;
}) {
  const { box, icon } = sizes[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${box}`}
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 10%, transparent)`,
      }}
    >
      <Icon size={icon} stroke={1.75} />
    </span>
  );
}
