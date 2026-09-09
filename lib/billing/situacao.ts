/**
 * O vocabulário de situação, num lugar só.
 *
 * **Assinatura e cobrança são coisas diferentes, e a tela misturava as
 * duas.** Uma empresa pode estar ativa com uma fatura em aberto — pagou o
 * mês passado, o novo ciclo emitiu e o Pix ainda não caiu. Isso não é
 * inconsistência: é o estado normal de todo dia 1º.
 *
 * O que ERA defeito: a tela decidia a situação com
 * `suspended ? "Bloqueada" : teste ? "Em teste" : "Ativa"`, e "Ativa" era o
 * que sobrava. Empresa com acesso vencido há dez dias lia "Ativa" do mesmo
 * jeito. `deriveStatus` já fazia a conta certa em `cycle.ts` e não era
 * chamado por ninguém.
 *
 * Módulo PURO de propósito: nenhuma consulta, nenhuma data implícita. Quem
 * chama passa o dia civil já resolvido no fuso da plataforma — ler o
 * relógio aqui dentro faria a resposta depender de onde o código roda, que
 * é a regra 15 do CLAUDE.md e já custou dois defeitos neste projeto.
 */

export type Tom = "neutro" | "positivo" | "atencao" | "critico";

/**
 * Situação da ASSINATURA — o vínculo da empresa com o produto.
 *
 * Não confundir com a situação de uma cobrança. Uma assinatura ativa
 * convive com fatura aguardando pagamento o mês inteiro.
 */
export type SituacaoDaAssinatura =
  "bloqueada" | "cancelada" | "vitalicia" | "teste" | "atrasada" | "ativa";

/**
 * Situação de UMA COBRANÇA.
 *
 * Os seis estados existem para a interface não depender do texto que o
 * provedor devolve. **Nem todos são alcançáveis hoje:** o Pix da EFI vai de
 * ATIVA para CONCLUIDA sem etapa intermediária, e uma cobrança Pix não
 * "falha" — ela vence ou é removida. `processando` e `falhou` ficam
 * declarados porque provedor de boleto e de cartão têm os dois, e o dia em
 * que um deles entrar não pode exigir mexer em componente de tela.
 *
 * Declarar não é simular: nada neste arquivo produz esses dois estados a
 * partir da EFI.
 */
export type SituacaoDaCobranca =
  "aguardando" | "processando" | "paga" | "expirada" | "falhou" | "cancelada";

export type LeituraDaAssinatura = {
  situacao: SituacaoDaAssinatura;
  rotulo: string;
  tom: Tom;
  /** Uma frase curta para quem precisa entender o porquê. */
  explicacao: string | null;
};

/**
 * A situação da assinatura, em ordem de precedência.
 *
 * A ORDEM é a regra, e cada degrau tem um motivo:
 *
 * 1. `bloqueada` — decisão administrativa da plataforma. Vence tudo, senão
 *    uma empresa suspensa apareceria "em teste" e ninguém entenderia por
 *    que não entra.
 * 2. `cancelada` — decisão de quem assina. Vence o resto porque nada mais
 *    importa depois dela.
 * 3. `vitalicia` — promessa feita a uma pessoa (0085). Vem antes de "ativa"
 *    para a tela poder dizer que não haverá cobrança, em vez de deixar o
 *    cliente esperando uma fatura que nunca vem.
 * 4. `teste` — período de avaliação em curso.
 * 5. `atrasada` — o acesso venceu e a carência passou. **Depois** do teste,
 *    porque teste terminado não é inadimplência.
 * 6. `ativa` — o resto.
 */
export function situacaoDaAssinatura(input: {
  suspensa: boolean;
  emTeste: boolean;
  /** Dia civil "YYYY-MM-DD" em que o teste termina. */
  testeAte: string | null;
  vitalicio: boolean;
  cancelada: boolean;
  /** Dia civil "YYYY-MM-DD" até quando o acesso vale (já com a carência). */
  acessoAte: string | null;
  /** Dia civil de hoje, no fuso da plataforma. */
  hoje: string;
}): LeituraDaAssinatura {
  if (input.suspensa) {
    return {
      situacao: "bloqueada",
      rotulo: "Bloqueada",
      tom: "critico",
      explicacao: "O acesso foi bloqueado pela administração do TAFLOW.",
    };
  }

  if (input.cancelada) {
    return {
      situacao: "cancelada",
      rotulo: "Cancelada",
      tom: "atencao",
      explicacao: "Não haverá novas cobranças.",
    };
  }

  if (input.vitalicio) {
    return {
      situacao: "vitalicia",
      rotulo: "Ativa",
      tom: "positivo",
      explicacao: "Plano vitalício: não há cobrança.",
    };
  }

  // Comparação de string em datas "YYYY-MM-DD" ordena igual à cronologia, e
  // não passa por fuso nenhum. Converter para Date aqui seria reintroduzir
  // a armadilha que o formato civil existe para evitar.
  if (input.emTeste && input.testeAte && input.testeAte >= input.hoje) {
    return {
      situacao: "teste",
      rotulo: "Em teste",
      tom: "neutro",
      explicacao: null,
    };
  }

  if (input.acessoAte && input.acessoAte < input.hoje) {
    return {
      situacao: "atrasada",
      rotulo: "Pagamento em atraso",
      tom: "atencao",
      explicacao: "O acesso venceu. Pague a fatura para continuar.",
    };
  }

  return {
    situacao: "ativa",
    rotulo: "Ativa",
    tom: "positivo",
    explicacao: null,
  };
}

/**
 * A situação de uma cobrança, a partir do que o banco guarda.
 *
 * **`aberta` com o prazo no passado é `expirada`**, mesmo antes de a
 * varredura diária trocar o status. Ela é DIÁRIA enquanto a conta for Hobby
 * (regra 13), e até passar a tela mostraria como pagável um código que o
 * banco já recusa.
 *
 * `aberta` sem código também não é pagável — a fatura nasce antes da ida ao
 * provedor, e uma recusa dele deixa a linha para trás sem QR nenhum.
 */
export function situacaoDaCobranca(input: {
  /** O status gravado em `subscription_charge`. */
  status: string;
  expiraEm: string | null;
  temCodigo: boolean;
  agora: Date;
}): SituacaoDaCobranca {
  if (input.status === "paga") return "paga";
  if (input.status === "cancelada") return "cancelada";
  if (input.status === "expirada") return "expirada";

  if (input.status !== "aberta") {
    // Status que o banco não deveria produzir. Chamar de "falhou" é mais
    // honesto que assumir que dá para pagar.
    return "falhou";
  }

  const vencida =
    input.expiraEm !== null &&
    new Date(input.expiraEm).getTime() <= input.agora.getTime();

  if (vencida || !input.temCodigo) return "expirada";
  return "aguardando";
}

const ROTULO_DA_COBRANCA: Record<SituacaoDaCobranca, string> = {
  aguardando: "Aguardando pagamento",
  processando: "Pagamento em processamento",
  paga: "Pago",
  expirada: "Código Pix expirado",
  falhou: "Falha na cobrança",
  cancelada: "Cobrança cancelada",
};

const TOM_DA_COBRANCA: Record<SituacaoDaCobranca, Tom> = {
  aguardando: "atencao",
  processando: "neutro",
  paga: "positivo",
  expirada: "critico",
  falhou: "critico",
  cancelada: "neutro",
};

export function rotuloDaCobranca(s: SituacaoDaCobranca): string {
  return ROTULO_DA_COBRANCA[s];
}

export function tomDaCobranca(s: SituacaoDaCobranca): Tom {
  return TOM_DA_COBRANCA[s];
}

/** Estados em que não adianta continuar perguntando: nada mais muda. */
export function ehTerminal(s: SituacaoDaCobranca): boolean {
  return (
    s === "paga" || s === "expirada" || s === "falhou" || s === "cancelada"
  );
}
