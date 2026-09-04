/**
 * A grade da tabela vive no CSS, e num lugar só.
 *
 * Duas razões, e as duas são defeitos que apareceriam de outro jeito:
 *
 * 1. **Cabeçalho e linhas precisam da MESMA definição.** Uma tabela
 *    desalinhada é pior que nenhuma: quem lê segue a coluna e encontra
 *    outro dado. Duas strings em dois arquivos divergem no primeiro ajuste
 *    de largura.
 *
 * 2. **As trilhas não podem ser `auto`.** Cada linha é um grid próprio —
 *    grid só alinha colunas dentro do mesmo contêiner. Com `auto`, a
 *    largura de "Status" seria a do texto DAQUELA linha, e as colunas
 *    dançariam de uma para a outra. Larguras explícitas resolvem.
 *
 * As colunas somem por consulta de contêiner (`@container lista`), não por
 * largura de janela: a Lista mora dentro da casca, que tem barra lateral
 * recolhível — o espaço disponível não é o da tela.
 *
 * Ordem no DOM, sempre a mesma:
 * controle · demanda · status · setor · responsável · prazo · ações
 */

/** A grade em si. Vai no cabeçalho e em cada linha. */
export const GRADE = "tf-lista-grade";

/** Classes das células que somem em espaço apertado. */
export const CELULA = {
  status: "tf-lista-status",
  setor: "tf-lista-setor",
  responsavel: "tf-lista-resp",
} as const;
