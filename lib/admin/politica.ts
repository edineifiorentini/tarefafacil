/**
 * A política da plataforma: os números que valem para todo cadastro novo.
 *
 * Eles moram em `platform_setting` (0088), tabela de uma linha só. Antes
 * eram literais espalhados — `interval '7 days'` dentro da trigger de
 * cadastro, `default 5` na coluna de assentos — e mudá-los exigia migration.
 *
 * **Cada campo aqui tem uma regra que o respeita, e é por isso que ele
 * existe.** A tela de Configurações da plataforma recusava campos sem regra
 * de propósito: interruptor que não faz nada é pior que ausência, porque
 * quem administra acredita nele.
 */

export type PoliticaDaPlataforma = {
  /** Cadastros abertos ao público. Fechado, só entra quem tem convite. */
  cadastrosAbertos: boolean;
  /**
   * Dias de teste de quem se cadastra.
   *
   * **Não corta acesso**, e isso não é pendência: a 0060 decidiu que quem
   * barra é `access_expires_at`. Enquanto a cobrança não emite fatura,
   * cortar no oitavo dia trancaria a pessoa para fora por uma conta que o
   * sistema não sabe cobrar. Este número muda a contagem que aparece.
   */
  diasDeTeste: number;
  /** Assentos de um workspace novo. O convite respeita, desde a 0013. */
  assentosIniciais: number;
  /** Por quanto tempo a auditoria é guardada. A varredura semanal aplica. */
  diasDeAuditoria: number;
};

export const POLITICA_PADRAO: PoliticaDaPlataforma = {
  cadastrosAbertos: true,
  diasDeTeste: 7,
  assentosIniciais: 5,
  diasDeAuditoria: 365,
};

/**
 * Os limites são de sanidade, não de produto.
 *
 * Espelham os `check` da 0088 — mudar um lado sem o outro faz o painel
 * aceitar e o banco recusar, e o erro chega como falha crua em vez de
 * mensagem. Quem mexer aqui mexe na migration também.
 */
export const LIMITES = {
  diasDeTeste: { min: 0, max: 90 },
  assentosIniciais: { min: 1, max: 500 },
  diasDeAuditoria: { min: 30, max: 3650 },
} as const;

export type CampoDaPolitica = keyof typeof LIMITES;

const ROTULO: Record<CampoDaPolitica, string> = {
  diasDeTeste: "Os dias de teste",
  assentosIniciais: "Os assentos iniciais",
  diasDeAuditoria: "A retenção da auditoria",
};

export type Validacao =
  | { ok: true; valor: PoliticaDaPlataforma }
  | { ok: false; erro: string };

function inteiroNoLimite(v: unknown, campo: CampoDaPolitica): number | string {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    return `${ROTULO[campo]} precisa ser um número inteiro.`;
  }
  const { min, max } = LIMITES[campo];
  if (v < min || v > max) {
    return `${ROTULO[campo]} precisa ficar entre ${min} e ${max}.`;
  }
  return v;
}

/**
 * Valida o que chegou da tela antes de escrever no banco.
 *
 * Devolve a primeira falha em vez de uma lista: são três campos numa tela
 * pequena, e uma frase que diz o que corrigir resolve mais rápido que um
 * inventário de erros.
 */
export function validarPolitica(bruto: unknown): Validacao {
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, erro: "Envio inválido." };
  }
  const b = bruto as Record<string, unknown>;

  if (typeof b.cadastrosAbertos !== "boolean") {
    return { ok: false, erro: "O estado dos cadastros precisa ser sim ou não." };
  }

  const campos: CampoDaPolitica[] = [
    "diasDeTeste",
    "assentosIniciais",
    "diasDeAuditoria",
  ];
  const valores: Partial<Record<CampoDaPolitica, number>> = {};

  for (const campo of campos) {
    const r = inteiroNoLimite(b[campo], campo);
    if (typeof r === "string") return { ok: false, erro: r };
    valores[campo] = r;
  }

  return {
    ok: true,
    valor: {
      cadastrosAbertos: b.cadastrosAbertos,
      diasDeTeste: valores.diasDeTeste!,
      assentosIniciais: valores.assentosIniciais!,
      diasDeAuditoria: valores.diasDeAuditoria!,
    },
  };
}

/**
 * Esta linha de auditoria já passou do prazo?
 *
 * Separada da varredura para ser testável sem banco, e porque o erro caro
 * aqui é de borda: apagar um dia a mais é apagar a resposta de "quem mudou
 * isso" justamente de quem foi conferir.
 */
export function podeSairDaAuditoria(
  criadoEm: string,
  manterDias: number,
  agora: Date
): boolean {
  const limite = new Date(criadoEm).getTime() + manterDias * 86_400_000;
  return agora.getTime() > limite;
}

/** O texto que a tela mostra sob o campo de teste. Verdade, não promessa. */
export function descreverTeste(dias: number): string {
  if (dias === 0) {
    return "Sem período de teste: a empresa nasce sem contagem e sem data.";
  }
  const plural = dias === 1 ? "1 dia" : `${dias} dias`;
  return `Empresa nova nasce com ${plural} de teste. A contagem aparece para ela e na aba Empresas — não corta o acesso.`;
}
