import { describe, expect, it } from "vitest";

import type { Attachment, TaskApproval } from "@/types/database";

import { montarMateriais, versaoDaAprovacao } from "./ciclo";

/**
 * O ciclo de aprovação, testado pelo comportamento que o dono descreveu.
 *
 * Cada caso aqui é uma frase que alguém precisa poder dizer olhando a tela:
 * "o cliente ainda não viu", "ele pediu ajuste na v01", "a v02 está com
 * ele". Se um dia a derivação mudar de forma, o que não pode mudar são
 * essas frases.
 */

function anexo(p: Partial<Attachment> & { id: string }): Attachment {
  return {
    workspace_id: "w1",
    task_id: "t1",
    kind: "file",
    storage_key: `w1/t1/${p.id}`,
    external_url: null,
    filename: "arte.png",
    mime_type: "image/png",
    size_bytes: 1000,
    uploaded_by: null,
    entregavel: false,
    purged_at: null,
    purge_reason: null,
    material_id: p.id,
    versao: 1,
    publicado_em: null,
    mensagem_ao_cliente: null,
    para_aprovacao: true,
    created_at: "2026-09-01T10:00:00.000Z",
    ...p,
  };
}

function resposta(p: Partial<TaskApproval>): TaskApproval {
  return {
    id: `r-${p.created_at ?? "x"}`,
    workspace_id: "w1",
    task_id: "t1",
    share_link_id: "l1",
    decision: "aprovado",
    comment: null,
    author_name: "Marina",
    attachment_id: null,
    created_at: "2026-09-02T10:00:00.000Z",
    ...p,
  };
}

// --------------------------------------------------------- uma peça só

describe("uma versão", () => {
  it("recém-enviada é rascunho — o cliente não vê", () => {
    const [m] = montarMateriais([anexo({ id: "a1" })], []);
    expect(m.situacao).toBe("rascunho");
    expect(m.rascunho?.id).toBe("a1");
    expect(m.noAr).toBeNull();
    expect(m.proximaVersao).toBe(2);
  });

  it("publicada e sem resposta fica aguardando o cliente", () => {
    const [m] = montarMateriais(
      [
        anexo({
          id: "a1",
          entregavel: true,
          publicado_em: "2026-09-01T12:00:00.000Z",
        }),
      ],
      []
    );
    expect(m.situacao).toBe("aguardando");
    expect(m.rascunho).toBeNull();
    expect(m.noAr?.id).toBe("a1");
  });

  it("aprovada pelo cliente diz aprovada", () => {
    const [m] = montarMateriais(
      [
        anexo({
          id: "a1",
          entregavel: true,
          publicado_em: "2026-09-01T12:00:00.000Z",
        }),
      ],
      [resposta({ attachment_id: "a1", decision: "aprovado" })]
    );
    expect(m.situacao).toBe("aprovada");
    expect(m.versoes[0].resposta?.autor).toBe("Marina");
  });

  it("com pedido de ajuste diz ajustes, e guarda o que ele escreveu", () => {
    const [m] = montarMateriais(
      [
        anexo({
          id: "a1",
          entregavel: true,
          publicado_em: "2026-09-01T12:00:00.000Z",
        }),
      ],
      [
        resposta({
          attachment_id: "a1",
          decision: "ajuste",
          comment: "o logo está pequeno",
        }),
      ]
    );
    expect(m.situacao).toBe("ajustes");
    expect(m.versoes[0].resposta?.comentario).toBe("o logo está pequeno");
  });
});

// ------------------------------------------------------------ o ciclo

describe("o ciclo inteiro", () => {
  // v01 publicada, cliente pediu ajuste, v02 publicada no lugar.
  const ciclo = [
    anexo({
      id: "v1",
      material_id: "v1",
      versao: 1,
      entregavel: false,
      publicado_em: "2026-09-01T12:00:00.000Z",
      created_at: "2026-09-01T10:00:00.000Z",
    }),
    anexo({
      id: "v2",
      material_id: "v1",
      versao: 2,
      entregavel: true,
      publicado_em: "2026-09-03T12:00:00.000Z",
      created_at: "2026-09-03T10:00:00.000Z",
      mensagem_ao_cliente: "aumentei o logo",
    }),
  ];
  const pedido = [
    resposta({
      attachment_id: "v1",
      decision: "ajuste",
      comment: "o logo está pequeno",
      created_at: "2026-09-02T10:00:00.000Z",
    }),
  ];

  it("junta as duas versões numa peça só", () => {
    const materiais = montarMateriais(ciclo, pedido);
    expect(materiais).toHaveLength(1);
    expect(materiais[0].versoes.map((v) => v.numero)).toEqual([2, 1]);
    expect(materiais[0].proximaVersao).toBe(3);
  });

  it("a v01 continua dizendo o que o cliente disse dela", () => {
    const [m] = montarMateriais(ciclo, pedido);
    const v1 = m.versoes.find((v) => v.numero === 1);
    expect(v1?.situacao).toBe("ajustes");
    expect(v1?.resposta?.comentario).toBe("o logo está pequeno");
  });

  it("a v02 está com o cliente, com o recado dela", () => {
    const [m] = montarMateriais(ciclo, pedido);
    expect(m.situacao).toBe("aguardando");
    expect(m.noAr?.numero).toBe(2);
    expect(m.noAr?.mensagemAoCliente).toBe("aumentei o logo");
  });

  /**
   * A decisão 3 do dono, em 9/set/2026: aprovou a v01, o registro fica na
   * v01. Subiu a v02, a demanda VOLTA a aguardar. Sem isto, uma peça
   * corrigida herdaria um "aprovado" que ninguém deu a ela — que é
   * exatamente o defeito que a 0093 veio consertar.
   */
  it("a aprovação NÃO migra para a versão seguinte", () => {
    const [m] = montarMateriais(ciclo, [
      resposta({
        attachment_id: "v1",
        decision: "aprovado",
        created_at: "2026-09-02T10:00:00.000Z",
      }),
    ]);
    expect(m.versoes.find((v) => v.numero === 1)?.situacao).toBe("aprovada");
    expect(m.versoes.find((v) => v.numero === 2)?.situacao).toBe("aguardando");
    expect(m.situacao).toBe("aguardando");
  });

  it("uma versão publicada e trocada, sem resposta, ficou substituída", () => {
    const [m] = montarMateriais(ciclo, []);
    expect(m.versoes.find((v) => v.numero === 1)?.situacao).toBe("substituida");
  });

  it("um rascunho pendente vence a versão que está no ar", () => {
    const [m] = montarMateriais(
      [
        ...ciclo,
        anexo({
          id: "v3",
          material_id: "v1",
          versao: 3,
          created_at: "2026-09-05T10:00:00.000Z",
        }),
      ],
      pedido
    );
    // O cliente continua vendo a v02; quem produz precisa ver que a v03
    // está esperando para ir.
    expect(m.situacao).toBe("rascunho");
    expect(m.rascunho?.numero).toBe(3);
    expect(m.noAr?.numero).toBe(2);
  });
});

// ------------------------------------------------------ várias respostas

describe("respostas repetidas", () => {
  const publicado = [
    anexo({
      id: "a1",
      entregavel: true,
      publicado_em: "2026-09-01T12:00:00.000Z",
    }),
  ];

  it("a última palavra do cliente sobre a mesma versão é a que vale", () => {
    const [m] = montarMateriais(publicado, [
      resposta({
        attachment_id: "a1",
        decision: "ajuste",
        created_at: "2026-09-02T10:00:00.000Z",
      }),
      resposta({
        attachment_id: "a1",
        decision: "aprovado",
        created_at: "2026-09-04T10:00:00.000Z",
      }),
    ]);
    expect(m.situacao).toBe("aprovada");
  });

  it("a ordem em que as respostas chegam na lista não muda o resultado", () => {
    const [m] = montarMateriais(publicado, [
      resposta({
        attachment_id: "a1",
        decision: "aprovado",
        created_at: "2026-09-04T10:00:00.000Z",
      }),
      resposta({
        attachment_id: "a1",
        decision: "ajuste",
        created_at: "2026-09-02T10:00:00.000Z",
      }),
    ]);
    expect(m.situacao).toBe("aprovada");
  });

  /**
   * Link enviado antes da 0093 grava `attachment_id` nulo. Ele não pode
   * marcar versão nenhuma — nem a primeira, nem a que estiver no ar.
   */
  it("resposta sem versão não carimba nada", () => {
    const [m] = montarMateriais(publicado, [
      resposta({ attachment_id: null, decision: "aprovado" }),
    ]);
    expect(m.situacao).toBe("aguardando");
    expect(m.versoes[0].resposta).toBeNull();
  });
});

// ---------------------------------------------------- peças diferentes

describe("mais de uma peça", () => {
  it("cada material tem sua própria história", () => {
    const materiais = montarMateriais(
      [
        anexo({
          id: "a1",
          filename: "cartaz.png",
          entregavel: true,
          publicado_em: "2026-09-01T12:00:00.000Z",
          created_at: "2026-09-01T10:00:00.000Z",
        }),
        anexo({
          id: "b1",
          filename: "post.png",
          created_at: "2026-09-04T10:00:00.000Z",
        }),
      ],
      [resposta({ attachment_id: "a1", decision: "aprovado" })]
    );

    expect(materiais).toHaveLength(2);
    // A mexida por último em cima.
    expect(materiais[0].nome).toBe("post.png");
    expect(materiais[0].situacao).toBe("rascunho");
    expect(materiais[1].nome).toBe("cartaz.png");
    expect(materiais[1].situacao).toBe("aprovada");
  });

  it("o nome da peça é o da versão mais nova", () => {
    const [m] = montarMateriais(
      [
        anexo({ id: "v1", material_id: "v1", versao: 1, filename: "v1.png" }),
        anexo({
          id: "v2",
          material_id: "v1",
          versao: 2,
          filename: "v2-final.png",
        }),
      ],
      []
    );
    expect(m.nome).toBe("v2-final.png");
  });
});

// --------------------------------------------- a versão que a resposta marca

describe("versaoDaAprovacao", () => {
  it("com uma peça publicada, aponta ela", () => {
    expect(versaoDaAprovacao([{ id: "a1" }])).toBe("a1");
  });

  /**
   * Com duas peças no ar, o clique do cliente não escolheu arquivo nenhum —
   * a aprovação é da demanda, como sempre foi (0064). Apontar uma delas
   * inventaria uma precisão que não houve.
   */
  it("com duas ou mais, não aponta nenhuma", () => {
    expect(versaoDaAprovacao([{ id: "a1" }, { id: "b1" }])).toBeNull();
  });

  it("sem peça publicada, não aponta nada", () => {
    expect(versaoDaAprovacao([])).toBeNull();
  });
});

// ------------------------------------------- corrigir versus trocar arquivo

describe("jaPublicou", () => {
  it("um rascunho que nunca foi ao ar não tem próxima versão", () => {
    const [m] = montarMateriais([anexo({ id: "a1" })], []);
    expect(m.jaPublicou).toBe(false);
  });

  it("uma vez publicada, a peça passa a aceitar versão nova", () => {
    const [m] = montarMateriais(
      [
        anexo({
          id: "a1",
          entregavel: true,
          publicado_em: "2026-09-01T12:00:00.000Z",
        }),
      ],
      []
    );
    expect(m.jaPublicou).toBe(true);
  });

  /**
   * Tirar do ar não apaga a história: a peça já foi publicada uma vez, e
   * continuar a partir da v02 é o caminho certo.
   */
  it("tirar do ar não faz a peça voltar a ser rascunho novo", () => {
    const [m] = montarMateriais(
      [
        anexo({
          id: "a1",
          entregavel: false,
          publicado_em: "2026-09-01T12:00:00.000Z",
        }),
      ],
      []
    );
    expect(m.jaPublicou).toBe(true);
  });
});
