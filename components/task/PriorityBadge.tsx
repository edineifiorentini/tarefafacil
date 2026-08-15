import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
} from "@tabler/icons-react";

import type { IconComponent } from "@/components/ui/types";
import type { TaskPriority } from "@/types/database";

// Só os níveis que merecem chamar atenção viram badge (baixa/alta/urgente);
// "normal" (media) e "sem prioridade" ficam invisíveis, como já era p/ alta
// antes desta rodada. Cor + ícone sempre juntos (nunca só cor).
const META: Partial<
  Record<TaskPriority, { label: string; tone: string; icon: IconComponent }>
> = {
  urgente: {
    label: "Urgente",
    tone: "var(--color-overdue)",
    icon: IconAlertTriangle,
  },
  alta: { label: "Alta", tone: "var(--tone-amber)", icon: IconArrowUp },
  baixa: { label: "Baixa", tone: "var(--tone-blue)", icon: IconArrowDown },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = META[priority];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap"
      style={{
        color: meta.tone,
        background: `color-mix(in srgb, ${meta.tone} 14%, transparent)`,
      }}
    >
      <Icon size={12} stroke={2.25} aria-hidden />
      {meta.label}
    </span>
  );
}
