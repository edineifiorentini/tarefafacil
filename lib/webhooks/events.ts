// Catálogo de eventos de saída. Puro — sem banco, sem rede.
//
// ISTO É CONTRATO. Publicado um evento, o nome e o formato dele não mudam
// mais sem quebrar a integração de alguém que a gente não controla. Por isso
// o catálogo é explícito aqui, e não derivado dos nomes de coluna de
// `task_activity`: derivar significaria que renomear uma coluna interna
// quebra um cliente lá fora.
//
// REGRA 9 DO CLAUDE.md: subtarefa nunca gera evento para fora. Ela é item de
// conferência dentro de uma demanda, não um compromisso próprio. O filtro
// está NA ORIGEM do disparo, não na tela — evento que sai errado já saiu.

export const EVENTOS = [
  "demanda.criada",
  "demanda.movida",
  "demanda.concluida",
  "demanda.reaberta",
  "demanda.atribuida",
  "demanda.excluida",
  "comentario.criado",
  "projeto.criado",
] as const;

export type Evento = (typeof EVENTOS)[number];

export const EVENTO_DESCRICAO: Record<Evento, string> = {
  "demanda.criada": "Uma demanda foi criada",
  "demanda.movida": "Uma demanda mudou de coluna no quadro",
  "demanda.concluida": "Uma demanda foi concluída",
  "demanda.reaberta": "Uma demanda concluída voltou a ficar aberta",
  "demanda.atribuida": "O responsável de uma demanda mudou",
  "demanda.excluida": "Uma demanda foi excluída",
  "comentario.criado": "Alguém comentou numa demanda",
  "projeto.criado": "Um projeto foi criado",
};

export function ehEvento(v: unknown): v is Evento {
  return typeof v === "string" && (EVENTOS as readonly string[]).includes(v);
}

/**
 * O que vai no corpo de toda entrega.
 *
 * `versao` existe desde o primeiro dia porque adicioná-la depois é o que
 * obriga todo cliente a lidar com "às vezes tem, às vezes não". Ela muda
 * quando o formato QUEBRA, não quando um campo novo aparece — campo novo é
 * compatível, e quem lê JSON ignora o que não conhece.
 */
export const VERSAO_DO_CORPO = 1;

export type CorpoDoEvento = {
  versao: number;
  evento: Evento;
  /** ISO do momento em que o fato aconteceu, não do envio. */
  ocorridoEm: string;
  /** Identificador único desta ENTREGA, para o destino ser idempotente. */
  entregaId: string;
  empresa: { id: string; nome: string };
  dados: Record<string, unknown>;
};

/**
 * Nome do cabeçalho que leva a assinatura.
 *
 * Não reaproveita `Authorization`: o destino pode já usá-lo para outra coisa,
 * e cabeçalho próprio deixa claro que isto é verificação de origem, não
 * credencial de acesso.
 */
export const CABECALHO_ASSINATURA = "x-taflow-assinatura";
export const CABECALHO_TIMESTAMP = "x-taflow-timestamp";
export const CABECALHO_ENTREGA = "x-taflow-entrega";

/**
 * Janela em que uma assinatura vale, em segundos.
 *
 * Sem carimbo de tempo, quem capturar uma entrega a reenvia para sempre e o
 * destino não tem como distinguir. Cinco minutos cobre relógio dessincronizado
 * sem virar janela de reuso.
 */
export const JANELA_DE_ASSINATURA_S = 300;
