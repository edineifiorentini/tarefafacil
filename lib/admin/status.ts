// Estados de empresa (especificação 9.2), num lugar só.
//
// A regra vive aqui e não em cada tela porque "está ativa?" precisa dar a
// mesma resposta na visão geral, na listagem, no detalhe e nos alertas.
//
// O QUE AINDA NÃO EXISTE: "cancelamento agendado" e "excluída logicamente"
// foram pedidos na 9.2, mas dependem de colunas que o banco não tem
// (`cancel_at`, `deleted_at`). Estão fora em vez de mal aproximados.

export type StatusEmpresa =
  | "teste"
  | "ativa"
  | "pendente"
  | "inadimplente"
  | "suspensa"
  | "inativa"
  | "cancelada";

export const STATUS_META: Record<
  StatusEmpresa,
  { label: string; tone: string }
> = {
  teste: { label: "Em teste", tone: "var(--chart-2)" },
  ativa: { label: "Ativa", tone: "var(--positive)" },
  pendente: { label: "Pagamento pendente", tone: "var(--status-due-soon-fg)" },
  inadimplente: { label: "Inadimplente", tone: "var(--negative)" },
  suspensa: { label: "Suspensa", tone: "var(--negative)" },
  inativa: { label: "Inativa", tone: "var(--text-muted)" },
  cancelada: { label: "Cancelada", tone: "var(--text-muted)" },
};

export type EntradaDeStatus = {
  suspended: boolean;
  access_expires_at: string | null;
  trial: boolean;
};

/**
 * Ordem de precedência, do mais forte ao mais fraco:
 *
 * 1. **Suspensa** — decisão manual da plataforma, ganha de tudo.
 * 2. **Inativa** — o acesso venceu; a conta não entra, qualquer que seja a
 *    assinatura.
 * 3. **Estado da assinatura** — vencida vira inadimplente, pendente vira
 *    pagamento pendente, cancelada vira cancelada.
 * 4. **Em teste** — só quando nada acima se aplica: uma conta em teste com
 *    pagamento pendente é um problema de cobrança, não um teste.
 * 5. **Ativa** — o resto.
 */
export function statusDaEmpresa(
  w: EntradaDeStatus,
  statusAssinatura: string | null | undefined,
  agora = Date.now()
): StatusEmpresa {
  if (w.suspended) return "suspensa";
  if (w.access_expires_at && new Date(w.access_expires_at).getTime() < agora) {
    return "inativa";
  }
  if (statusAssinatura === "vencida") return "inadimplente";
  if (statusAssinatura === "pendente") return "pendente";
  if (statusAssinatura === "cancelada") return "cancelada";
  if (w.trial) return "teste";
  return "ativa";
}
