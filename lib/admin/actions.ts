// Ações administrativas sobre uma empresa (especificação 9.7).
//
// O contrato vive aqui porque a MESMA definição precisa valer nos dois lados:
// o diálogo decide se pede motivo, e o servidor decide se aceita sem ele.
// Duas listas separadas divergem, e a que diverge para menos é a do servidor
// — que é justamente a que importa.

/** O que se pode fazer com uma empresa pelo painel. */
export type AcaoDeEmpresa =
  | "alterar_plano"
  | "alterar_assentos"
  | "conceder_acesso"
  | "encerrar_teste"
  | "suspender"
  | "reativar"
  | "excluir"
  | "restaurar"
  | "anotar";

export type DefinicaoDeAcao = {
  /** Rótulo do botão. Verbo específico, nunca "Confirmar" (seção 20). */
  label: string;
  /** Título do diálogo de confirmação. */
  titulo: string;
  /** O que vai acontecer, em uma frase. */
  consequencia: string;
  /**
   * Exige motivo escrito?
   *
   * Sim para tudo que muda o dinheiro ou o acesso da empresa. Não para
   * anotar — a nota JÁ é o texto, pedir um motivo para escrever um motivo
   * é burocracia sem leitor.
   */
  exigeMotivo: boolean;
  /**
   * Exige digitar o nome da empresa para liberar?
   *
   * Só para o que é difícil de desfazer. Confirmação por digitação em ação
   * corriqueira treina a pessoa a digitar sem ler.
   */
  exigeNome: boolean;
  /** Ação destrutiva: o botão vai em vermelho. */
  destrutiva: boolean;
};

export const ACOES: Record<AcaoDeEmpresa, DefinicaoDeAcao> = {
  alterar_plano: {
    label: "Alterar plano",
    titulo: "Alterar o plano da empresa",
    consequencia:
      "O plano novo passa a valer agora e os assentos acompanham o limite dele.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: false,
  },
  alterar_assentos: {
    label: "Alterar assentos",
    titulo: "Alterar o limite de assentos",
    consequencia:
      "O limite muda na hora. Reduzir abaixo do que já está em uso não remove ninguém — apenas impede novos convites.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: false,
  },
  conceder_acesso: {
    label: "Conceder acesso",
    titulo: "Estender o acesso da empresa",
    consequencia: "A data de vencimento do acesso é empurrada para a frente.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: false,
  },
  encerrar_teste: {
    label: "Encerrar teste",
    titulo: "Encerrar o período de teste",
    consequencia:
      "A empresa sai do teste e passa a contar como assinante. Não gera cobrança sozinha.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: false,
  },
  suspender: {
    label: "Suspender conta",
    titulo: "Suspender a empresa",
    consequencia:
      "Ninguém da empresa consegue entrar até a reativação. Os dados ficam intactos.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: true,
  },
  reativar: {
    label: "Reativar conta",
    titulo: "Reativar a empresa",
    consequencia: "A equipe volta a entrar imediatamente.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: false,
  },
  excluir: {
    label: "Excluir empresa",
    titulo: "Excluir a empresa",
    consequencia:
      "A empresa sai do ar para o cliente e fica guardada por 30 dias, restaurável a qualquer momento nesse prazo. Nada é apagado agora.",
    exigeMotivo: true,
    exigeNome: true,
    destrutiva: true,
  },
  restaurar: {
    label: "Restaurar empresa",
    titulo: "Restaurar a empresa",
    consequencia:
      "A empresa volta para o cliente, ainda suspensa — reative em seguida para liberar o acesso.",
    exigeMotivo: true,
    exigeNome: false,
    destrutiva: false,
  },
  anotar: {
    label: "Registrar observação",
    titulo: "Observação interna",
    consequencia: "Fica visível só para a plataforma. O cliente nunca vê.",
    exigeMotivo: false,
    exigeNome: false,
    destrutiva: false,
  },
};

/** Tamanho mínimo de um motivo que serve para alguma coisa. */
export const MOTIVO_MINIMO = 8;

export function ehAcaoDeEmpresa(v: unknown): v is AcaoDeEmpresa {
  return typeof v === "string" && v in ACOES;
}

/**
 * Valida o motivo. Devolve `null` quando está bom, ou a mensagem de erro.
 *
 * Roda no servidor E no diálogo. O servidor é a autoridade: esconder o botão
 * no navegador nunca foi controle.
 */
export function validarMotivo(
  acao: AcaoDeEmpresa,
  motivo: string | undefined
): string | null {
  if (!ACOES[acao].exigeMotivo) return null;
  const limpo = (motivo ?? "").trim();
  if (limpo.length === 0) return "Escreva o motivo desta ação";
  if (limpo.length < MOTIVO_MINIMO) {
    return `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`;
  }
  return null;
}
