import type { TaskPriority } from "@/types/database";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  sem_prioridade: "Sem prioridade",
  baixa: "Baixa",
  media: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};
