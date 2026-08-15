import type { ClientStatus } from "@/types/database";

const META: Record<ClientStatus, { label: string; tone: string }> = {
  prospecto: { label: "Prospecto", tone: "var(--tone-violet)" },
  ativo: { label: "Ativo", tone: "var(--tone-blue)" },
  pausado: { label: "Pausado", tone: "var(--tone-amber)" },
  encerrado: { label: "Encerrado", tone: "var(--tone-neutral)" },
};

export function ClientStatusPill({ status }: { status: ClientStatus }) {
  const { label, tone } = META[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap"
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 14%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
