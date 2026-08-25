import { z } from "zod";

export const taskPriorities = [
  "sem_prioridade",
  "baixa",
  "media",
  "alta",
  "urgente",
] as const;

/**
 * Criação rápida.
 *
 * O design 6.1 pedia três campos: título, setor e prazo. Continuam sendo os
 * três da frente — registrar cinco tarefas seguidas é o que faz este
 * formulário valer, e cada campo a mais no caminho custa isso.
 *
 * O resto entra atrás de "Mais detalhes", opcional e sem validação além do
 * formato. Ficaram de fora os campos que **não podem existir antes da
 * tarefa existir**: anexo, subtarefa, comentário, tempo registrado,
 * histórico e resposta do cliente precisam de um id para se pendurar. Tags
 * também: vivem em `task_tag`, e gravá-las exige um segundo insert depois
 * de a tarefa nascer.
 */
export const quickAddSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe um título")
    .max(200, "No máximo 200 caracteres"),
  sector_id: z.string().uuid("Escolha um setor"),
  due_date: z.string().nullable().optional(),

  priority: z.enum(taskPriorities).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  service: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  /** Vem em horas do formulário; o banco guarda minutos. */
  estimate_hours: z.string().optional(),
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;

/** "2.5" ou "2,5" → 150. Vazio ou inválido → null. */
export function estimateToMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const horas = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(horas) && horas > 0 ? Math.round(horas * 60) : null;
}
