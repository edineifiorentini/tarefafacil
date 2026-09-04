/**
 * Cota de espaço por empresa, e o prazo que cada arquivo tem no servidor.
 *
 * **A estratégia mudou em 4/set/2026, e vale registrar o porquê.** Antes o
 * controle era um teto por ARQUIVO (25 MB). Isso resolvia o problema errado:
 * bloqueava o vídeo de campanha de 30 MB, que é legítimo, e não dizia nada
 * sobre a empresa que sobe mil imagens de 2 MB. O servidor tem 10 GB e o que
 * o esgota é o total, não a peça.
 *
 * Agora o teto é de ESPAÇO POR EMPRESA, e a saída para quem precisa de mais
 * não é pedir aumento: é apontar o arquivo para o Google Drive. Link do
 * Drive já custa zero byte de servidor hoje — é `kind = 'link'`, sem
 * `storage_key` —, então a régua distingue sozinha o que ocupa do que não
 * ocupa.
 *
 * Um teto por arquivo continua existindo porque a plataforma impõe um: o
 * Supabase recusa acima do limite do projeto, e sem uma trava local o
 * usuário receberia um 413 cru no meio do envio. Ele é técnico, não é
 * política — ver `TETO_POR_ARQUIVO`.
 */

/** 1 GB. Fase de projeto, num servidor de 10 GB. */
export const COTA_PADRAO_BYTES = 1_073_741_824;

/**
 * Teto por arquivo — **espelho do limite do projeto no Supabase**, não uma
 * regra de produto.
 *
 * Ele existe só para o erro chegar claro e antes do envio começar. Precisa
 * ser MENOR OU IGUAL ao limite configurado no painel do Supabase: se for
 * maior, o arquivo passa aqui e estoura lá, e a pessoa vê "Falha no upload
 * (413)" sem saber o que fazer.
 *
 * Quem aumentar aqui precisa aumentar lá primeiro.
 */
export const TETO_POR_ARQUIVO = 50 * 1024 * 1024;

/** Depois de aprovado, o arquivo cumpriu seu papel. */
export const DIAS_APOS_APROVACAO = 30;
/** Material que ninguém respondeu não fica ocupando espaço para sempre. */
export const DIAS_SEM_DECISAO = 45;
/** A partir daqui a interface começa a falar em conectar o Drive. */
export const FRACAO_DE_AVISO = 0.8;

export type MotivoDaRecusa = "arquivo_grande" | "cota_estourada";

export type Veredito =
  { cabe: true } | { cabe: false; motivo: MotivoDaRecusa; mensagem: string };

function mb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function formatarEspaco(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return mb(bytes);
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} GB`;
}

/**
 * O arquivo entra?
 *
 * Duas perguntas diferentes, e as mensagens precisam ser diferentes: uma
 * pessoa que bateu no teto do arquivo tem que dividir ou comprimir; uma que
 * bateu na cota tem que liberar espaço ou usar o Drive. Um erro genérico
 * mandaria as duas tentarem a coisa errada.
 */
export function cabeNoServidor(input: {
  tamanhoDoArquivo: number;
  usadoAgora: number;
  cota: number;
}): Veredito {
  if (input.tamanhoDoArquivo > TETO_POR_ARQUIVO) {
    return {
      cabe: false,
      motivo: "arquivo_grande",
      mensagem: `Arquivo de ${formatarEspaco(input.tamanhoDoArquivo)}. O limite por arquivo é ${mb(TETO_POR_ARQUIVO)} — para peças maiores, suba no Google Drive e cole o link aqui.`,
    };
  }

  if (input.usadoAgora + input.tamanhoDoArquivo > input.cota) {
    const livre = Math.max(0, input.cota - input.usadoAgora);
    return {
      cabe: false,
      motivo: "cota_estourada",
      mensagem: `Sem espaço: restam ${formatarEspaco(livre)} de ${formatarEspaco(input.cota)}. Apague anexos antigos ou suba no Google Drive e cole o link — arquivo no Drive não ocupa espaço aqui.`,
    };
  }

  return { cabe: true };
}

export type Ocupacao = {
  usado: number;
  cota: number;
  livre: number;
  /** 0 a 1. Passa de 1 se a cota foi reduzida depois dos arquivos subirem. */
  fracao: number;
  perto: boolean;
  cheio: boolean;
};

export function medirOcupacao(usado: number, cota: number): Ocupacao {
  // Cota zero ou negativa não existe na prática, mas dividir por ela
  // produziria Infinity e uma barra desenhada errada.
  const c = cota > 0 ? cota : COTA_PADRAO_BYTES;
  const fracao = usado / c;
  return {
    usado,
    cota: c,
    livre: Math.max(0, c - usado),
    fracao,
    perto: fracao >= FRACAO_DE_AVISO && fracao < 1,
    cheio: fracao >= 1,
  };
}

export type MotivoDaRetirada = "aprovado_30d" | "sem_decisao_45d";

export type CandidatoARetirada = {
  /** `null` quando o anexo não está no servidor (link do Drive). */
  storageKey: string | null;
  entregavel: boolean;
  criadoEm: string;
  /** Quando a demanda foi aprovada, se foi. */
  aprovadoEm: string | null;
  jaRetiradoEm: string | null;
};

const DIA = 86_400_000;

/**
 * Este arquivo já pode sair do servidor?
 *
 * Três regras, e o que elas NÃO fazem importa tanto quanto o que fazem:
 *
 * - **link do Drive nunca sai.** O arquivo não é nosso e não ocupa nada
 *   aqui; apagá-lo seria destruir o material do cliente na conta dele;
 * - **anexo interno nunca sai por tempo.** Briefing, referência e captura
 *   de tela são material de trabalho da equipe, não peça de aprovação. O
 *   dono pediu prazo para "arquivos para aprovação"; estender isso ao resto
 *   apagaria documento que ninguém combinou de apagar. A cota é que segura
 *   o volume deles;
 * - **quem já saiu não sai de novo.**
 */
export function podeSairDoServidor(
  c: CandidatoARetirada,
  agora: Date
): MotivoDaRetirada | null {
  if (!c.storageKey) return null;
  if (c.jaRetiradoEm) return null;
  if (!c.entregavel) return null;

  const t = agora.getTime();

  if (c.aprovadoEm) {
    const limite = new Date(c.aprovadoEm).getTime() + DIAS_APOS_APROVACAO * DIA;
    return t > limite ? "aprovado_30d" : null;
  }

  const limite = new Date(c.criadoEm).getTime() + DIAS_SEM_DECISAO * DIA;
  return t > limite ? "sem_decisao_45d" : null;
}

/** Quantos dias faltam para o arquivo sair. Negativo = já passou. */
export function diasAteSair(c: CandidatoARetirada, agora: Date): number | null {
  if (!c.storageKey || c.jaRetiradoEm || !c.entregavel) return null;
  const base = c.aprovadoEm
    ? new Date(c.aprovadoEm).getTime() + DIAS_APOS_APROVACAO * DIA
    : new Date(c.criadoEm).getTime() + DIAS_SEM_DECISAO * DIA;
  return Math.ceil((base - agora.getTime()) / DIA);
}

/** O texto que o cliente lê no lugar do arquivo que saiu. */
export function textoDoArquivoRetirado(retiradoEm: string): string {
  const d = retiradoEm.slice(0, 10).split("-").reverse().join("/");
  return `Este material saiu do servidor em ${d}. Peça uma nova cópia a quem enviou.`;
}
