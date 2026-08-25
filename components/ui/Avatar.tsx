type Size = "sm" | "md" | "xl";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: "h-6 w-6 text-[length:var(--text-caption-size)]",
  md: "h-8 w-8 text-[length:var(--text-small-size)]",
  // Só a tela de edição da própria foto usa este: é onde a pessoa precisa
  // ver o que escolheu, não a miniatura que o resto do app mostra.
  xl: "h-20 w-20 text-[length:var(--text-h2-size)]",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  if (src) {
    // next/image exigiria config de domínios; <img> é adequado p/ avatar de URL arbitrária.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]}`}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={`bg-selected text-fg-link inline-flex items-center justify-center rounded-full font-medium ${sizes[size]}`}
    >
      {initials(name)}
    </span>
  );
}
