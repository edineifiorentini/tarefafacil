import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Por que um prazo mudou — o catálogo de motivos.
 *
 * **Aprovado pelo dono em 11/set/2026**, a partir de um protótipo: prazo que
 * já existe só muda com motivo, e o primeiro prazo fica guardado para a
 * pontualidade (0099).
 *
 * Duas famílias de motivo:
 *
 * - **Os cinco de escolha**, que a pessoa marca ao reprogramar.
 * - **Os três automáticos**, que só o banco grava: a sincronia do Google
 *   aplica a data sem ninguém para responder, o desfazer devolve a data
 *   anterior, e qualquer outro caminho sem motivo fica "não informado" —
 *   visível no relatório, em vez de invisível.
 *
 * A lista espelha a trava do banco (0099); `reprogramacao.test.ts` lê a
 * migration e falha se as duas divergirem.
 */

export const MOTIVOS_DE_ESCOLHA = [
  "cliente_pediu_mudanca",
  "aguardando_cliente",
  "mudanca_escopo",
  "imprevisto_equipe",
  "outro",
] as const;

export const MOTIVOS_AUTOMATICOS = [
  "google_agenda",
  "google_desfeito",
  "nao_informado",
] as const;

export type MotivoDeEscolha = (typeof MOTIVOS_DE_ESCOLHA)[number];
export type MotivoDePrazo =
  MotivoDeEscolha | (typeof MOTIVOS_AUTOMATICOS)[number];

export const ROTULO_DO_MOTIVO: Record<MotivoDePrazo, string> = {
  cliente_pediu_mudanca: "Cliente pediu mudança",
  aguardando_cliente: "Aguardando retorno do cliente",
  mudanca_escopo: "Mudança de escopo",
  imprevisto_equipe: "Imprevisto da equipe",
  outro: "Outro",
  google_agenda: "Alterado no Google Agenda",
  google_desfeito: "Alteração do Google Agenda desfeita",
  nao_informado: "Motivo não informado",
};

export function ehMotivoDePrazo(
  valor: string | null | undefined
): valor is MotivoDePrazo {
  return !!valor && valor in ROTULO_DO_MOTIVO;
}

/** Rótulo para exibir; motivo desconhecido não quebra a tela. */
export function rotuloDoMotivo(
  valor: string | null | undefined
): string | null {
  return ehMotivoDePrazo(valor) ? ROTULO_DO_MOTIVO[valor] : null;
}

/**
 * A demanda foi reprogramada?
 *
 * Pela própria linha, sem histórico: o prazo atual é diferente do primeiro.
 * Tirar o prazo de uma demanda que tinha um também conta — é a mudança que
 * mais esconde atraso.
 */
export function foiReprogramada(task: {
  due_date: string | null;
  prazo_original: string | null;
}): boolean {
  if (!task.prazo_original) return false;
  return task.due_date !== task.prazo_original;
}

/**
 * O que a marca de reprogramação diz, na dica e para o leitor de tela.
 *
 * Um lugar só para o texto: o chip da Hoje e do Quadro e a célula da Lista
 * diriam o mesmo fato com palavras diferentes, e quem usa leitor de tela
 * ouviria duas frases para uma coisa só.
 */
export function textosDaReprogramacao(
  original: string,
  motivo: string | null | undefined
): { dica: string; leitor: string } {
  const data = format(parseISO(original), "d MMM", { locale: ptBR });
  const rotulo = rotuloDoMotivo(motivo);
  return {
    dica: `Prazo original: ${data}${rotulo ? ` · ${rotulo}` : ""}`,
    leitor: `, reprogramado — original ${data}${rotulo ? `, ${rotulo}` : ""}`,
  };
}

/**
 * A data tem cara de prazo de verdade?
 *
 * O campo de data do navegador passa por 0002, 0020 e 0202 enquanto o ano é
 * digitado, e cada passo é uma data válida. Antes da 0099 isso custava uma
 * gravação a mais; agora o primeiro prazo gravado vira o original para
 * sempre. Ano fora de 2000–2099 não grava nem reprograma.
 */
export function ehDataDePrazoPlausivel(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const ano = Number(iso.slice(0, 4));
  return ano >= 2000 && ano <= 2099;
}

/**
 * A recusa da função do banco, dita para quem reprogramou. Acontece quando o
 * prazo mudou entre abrir a janela e confirmar — outra pessoa, outra aba, o
 * Google Agenda — ou quando a demanda saiu do alcance de quem reprograma.
 */
export const REPROGRAMACAO_RECUSADA =
  "O prazo mudou enquanto a janela estava aberta. Feche, abra a demanda de novo e confira o prazo atual.";
