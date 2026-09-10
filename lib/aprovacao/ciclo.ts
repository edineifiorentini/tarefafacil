import type { Attachment, TaskApproval } from "@/types/database";

/**
 * O ciclo de aprovação de um material, derivado — nunca guardado.
 *
 * O ciclo real é: envia, o cliente pede ajuste, você corrige, envia de novo,
 * o cliente aprova. A 0093 deu ao banco o que faltava para contar essa
 * história (`material_id`, `versao`, `publicado_em`) e a 0096 separou a
 * trilha do cliente da de trabalho. Este arquivo é a leitura dessas colunas
 * — e é a ÚNICA. A tela pergunta aqui e desenha; não interpreta banco.
 *
 * **Nada disto é coluna de situação.** Pelo mesmo motivo de "atrasada" e
 * "vencido" no resto do projeto: situação guardada envelhece sozinha, e um
 * campo `status` teria de ser reescrito por três caminhos diferentes (subir
 * versão, publicar, o cliente responder) sem nunca poder errar. Derivar
 * custa um `map` e não erra nunca.
 */

/**
 * Onde uma versão está no ciclo.
 *
 * A ordem em que os casos são decididos importa e está no código, mas vale
 * dita aqui: **a resposta do cliente vence tudo**. Uma v01 que recebeu
 * "ajuste" continua dizendo "ajustes" depois de a v02 tomar o lugar dela —
 * é o registro do que aconteceu, e é a informação que explica por que
 * existe uma v02.
 */
export type SituacaoDaVersao =
  "rascunho" | "aguardando" | "aprovada" | "ajustes" | "substituida";

export const ROTULO_DA_VERSAO: Record<SituacaoDaVersao, string> = {
  rascunho: "Rascunho",
  aguardando: "Aguardando o cliente",
  aprovada: "Aprovada",
  ajustes: "Ajustes pedidos",
  substituida: "Substituída",
};

export type Versao = {
  id: string;
  numero: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  kind: Attachment["kind"];
  storageKey: string | null;
  externalUrl: string | null;
  publicadoEm: string | null;
  /** Quando o arquivo foi enviado — existe mesmo em rascunho. */
  criadoEm: string;
  mensagemAoCliente: string | null;
  /** É a versão que o cliente vê agora pelo link (`entregavel`). */
  noAr: boolean;
  /** Quando o arquivo saiu do servidor por prazo (0086), se saiu. */
  retiradoEm: string | null;
  situacao: SituacaoDaVersao;
  /** A resposta do cliente a ESTA versão, quando houve. */
  resposta: RespostaDoCliente | null;
};

export type RespostaDoCliente = {
  decisao: "aprovado" | "ajuste";
  comentario: string | null;
  autor: string | null;
  em: string;
};

export type Material = {
  /** `material_id` — o mesmo em todas as versões da peça. */
  id: string;
  /** O nome da versão mais recente: é como as pessoas chamam a peça. */
  nome: string;
  /** Da mais nova para a mais antiga — a ordem em que se lê um histórico. */
  versoes: Versao[];
  /** A versão publicada agora, se alguma estiver no ar. */
  noAr: Versao | null;
  /**
   * A versão pronta e ainda não publicada, se houver.
   *
   * É o que a tela precisa oferecer para revisar e publicar. Havendo mais
   * de um rascunho (dois envios seguidos sem publicar), é o mais recente —
   * o anterior continua na lista, e apagá-lo é decisão de quem produz.
   */
  rascunho: Versao | null;
  /** O número que a próxima versão desta peça vai receber. */
  proximaVersao: number;
  /**
   * Alguma versão desta peça já foi ao ar.
   *
   * **É o que separa "corrigir" de "trocar o arquivo".** Enquanto nada foi
   * publicado não existe próxima versão: existe um rascunho, que se
   * descarta e se envia de novo. Oferecer "enviar v02" antes de a v01 ter
   * saído convida a empilhar rascunhos numa peça que o cliente nunca viu.
   */
  jaPublicou: boolean;
  /**
   * A situação que resume a peça.
   *
   * Um rascunho pendente vence a versão no ar: quem abre a aba precisa ver
   * que há material esperando para ser publicado, não que o cliente já
   * respondeu ao que está lá.
   */
  situacao: SituacaoDaVersao;
};

type RespostaBruta = Pick<
  TaskApproval,
  "attachment_id" | "decision" | "comment" | "author_name" | "created_at"
>;

/**
 * A última resposta de cada versão.
 *
 * Última, e não a primeira: o cliente pode pedir ajuste e depois aprovar a
 * mesma versão — a página pública permite responder de novo de propósito.
 * O que vale é o que ele disse por último.
 */
function respostasPorVersao(
  respostas: RespostaBruta[]
): Map<string, RespostaDoCliente> {
  const mapa = new Map<string, RespostaDoCliente>();
  for (const r of respostas) {
    if (!r.attachment_id) continue;
    const anterior = mapa.get(r.attachment_id);
    if (anterior && anterior.em >= r.created_at) continue;
    mapa.set(r.attachment_id, {
      decisao: r.decision,
      comentario: r.comment,
      autor: r.author_name,
      em: r.created_at,
    });
  }
  return mapa;
}

function situacaoDaVersao(
  anexo: Attachment,
  resposta: RespostaDoCliente | null
): SituacaoDaVersao {
  // O que o cliente respondeu sobre ESTA versão vale para sempre, mesmo
  // depois de ela sair do ar.
  if (resposta) {
    return resposta.decisao === "aprovado" ? "aprovada" : "ajustes";
  }
  if (anexo.publicado_em === null) return "rascunho";
  if (anexo.entregavel) return "aguardando";
  return "substituida";
}

/**
 * Agrupa os anexos da trilha de aprovação em materiais versionados.
 *
 * Recebe as duas listas cruas e devolve a árvore que a tela desenha. As
 * respostas entram por `attachment_id`, que é nulo nas anteriores à 0093 e
 * nas que chegam por link antigo — essas simplesmente não marcam versão
 * nenhuma, que é o correto: o histórico não é reescrito com um palpite.
 */
export function montarMateriais(
  anexos: Attachment[],
  respostas: RespostaBruta[]
): Material[] {
  const porVersao = respostasPorVersao(respostas);

  const grupos = new Map<string, Attachment[]>();
  for (const a of anexos) {
    const atual = grupos.get(a.material_id);
    if (atual) atual.push(a);
    else grupos.set(a.material_id, [a]);
  }

  const materiais: Material[] = [];
  for (const [id, linhas] of grupos) {
    const versoes = linhas
      .map((a) => {
        const resposta = porVersao.get(a.id) ?? null;
        return {
          id: a.id,
          numero: a.versao,
          filename: a.filename,
          mimeType: a.mime_type,
          sizeBytes: a.size_bytes,
          kind: a.kind,
          storageKey: a.storage_key,
          externalUrl: a.external_url,
          publicadoEm: a.publicado_em,
          criadoEm: a.created_at,
          mensagemAoCliente: a.mensagem_ao_cliente,
          noAr: a.entregavel,
          retiradoEm: a.purged_at,
          situacao: situacaoDaVersao(a, resposta),
          resposta,
        } satisfies Versao;
      })
      .sort((a, b) => b.numero - a.numero);

    // Um grupo sem linha nenhuma não existe: o Map nasce do próprio anexo.
    const maisNova = versoes[0];
    const noAr = versoes.find((v) => v.noAr) ?? null;
    const rascunho = versoes.find((v) => v.publicadoEm === null) ?? null;

    materiais.push({
      id,
      nome: maisNova.filename,
      versoes,
      noAr,
      rascunho,
      proximaVersao: maisNova.numero + 1,
      jaPublicou: versoes.some((v) => v.publicadoEm !== null),
      situacao: rascunho
        ? rascunho.situacao
        : (noAr?.situacao ?? maisNova.situacao),
    });
  }

  // Peça mexida por último em cima: é onde está a atenção de quem produz.
  // O critério é quando a última versão ENTROU, e não quando foi publicada,
  // porque um rascunho recém-enviado é exatamente o que se está esperando
  // ver — e ele ainda não tem data de publicação.
  return materiais.sort((a, b) =>
    b.versoes[0].criadoEm.localeCompare(a.versoes[0].criadoEm)
  );
}

/**
 * A versão que uma aprovação pelo link público deve carimbar.
 *
 * **Só responde quando não há dúvida.** Com um material publicado, a
 * resposta do cliente é sobre aquela versão e o registro fica preciso. Com
 * dois ou mais, a aprovação continua sendo da DEMANDA — como sempre foi
 * (0064) — e apontar um dos arquivos seria inventar uma precisão que o
 * clique não teve. Nulo é a resposta honesta, e é o que a coluna já aceita.
 */
export function versaoDaAprovacao(publicados: { id: string }[]): string | null {
  return publicados.length === 1 ? publicados[0].id : null;
}
