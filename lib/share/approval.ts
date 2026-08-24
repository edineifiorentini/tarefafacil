import type { TaskApproval } from "@/types/database";

/**
 * O estado de aprovação de uma demanda.
 *
 * A tabela guarda HISTÓRICO (0064): envia, cliente pede ajuste, corrige,
 * envia de novo, cliente aprova. O estado atual é sempre a última linha —
 * e é derivado na leitura, nunca gravado, pelo mesmo motivo de "atrasada"
 * e "vencido" no resto do projeto: estado guardado envelhece sozinho.
 */

export type ApprovalState = "sem_resposta" | "aprovado" | "ajuste";

export function latestApproval(approvals: TaskApproval[]): TaskApproval | null {
  if (approvals.length === 0) return null;
  return [...approvals].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  )[0];
}

export function approvalState(approvals: TaskApproval[]): ApprovalState {
  return latestApproval(approvals)?.decision ?? "sem_resposta";
}

export const APPROVAL_LABEL: Record<ApprovalState, string> = {
  sem_resposta: "Sem resposta do cliente",
  aprovado: "Aprovado pelo cliente",
  ajuste: "Cliente pediu ajuste",
};

/**
 * Quantas idas e vindas até aqui.
 *
 * Conta só os pedidos de ajuste: é o número que responde "esta peça deu
 * trabalho?" — aprovar uma vez no fim é o esperado, pedir ajuste quatro
 * vezes não.
 */
export function revisionCount(approvals: TaskApproval[]): number {
  return approvals.filter((a) => a.decision === "ajuste").length;
}
