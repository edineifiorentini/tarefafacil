import { describe, expect, it } from "vitest";

import type { TaskApproval } from "@/types/database";

import {
  APPROVAL_LABEL,
  approvalState,
  latestApproval,
  revisionCount,
} from "./approval";

function resposta(
  decision: "aprovado" | "ajuste",
  created_at: string,
  comment: string | null = null
): TaskApproval {
  return {
    id: `${decision}-${created_at}`,
    workspace_id: "w1",
    task_id: "t1",
    share_link_id: "l1",
    decision,
    comment,
    author_name: "Cliente",
    created_at,
  };
}

describe("approvalState", () => {
  it("sem resposta é sem resposta", () => {
    expect(approvalState([])).toBe("sem_resposta");
  });

  it("vale a última, não a primeira", () => {
    const lista = [
      resposta("ajuste", "2026-08-20T10:00:00Z"),
      resposta("aprovado", "2026-08-21T10:00:00Z"),
    ];
    expect(approvalState(lista)).toBe("aprovado");
  });

  it("aprovado e depois pedido de ajuste volta a ser ajuste", () => {
    // Acontece: o cliente aprova, vê impresso e muda de ideia.
    const lista = [
      resposta("aprovado", "2026-08-20T10:00:00Z"),
      resposta("ajuste", "2026-08-22T09:00:00Z"),
    ];
    expect(approvalState(lista)).toBe("ajuste");
  });

  it("não depende da ordem em que a lista chega", () => {
    const emOrdem = [
      resposta("ajuste", "2026-08-20T10:00:00Z"),
      resposta("aprovado", "2026-08-21T10:00:00Z"),
    ];
    const embaralhada = [...emOrdem].reverse();
    expect(approvalState(embaralhada)).toBe(approvalState(emOrdem));
  });
});

describe("latestApproval", () => {
  it("devolve a linha inteira, com o comentário", () => {
    const lista = [
      resposta("ajuste", "2026-08-20T10:00:00Z", "trocar a cor"),
      resposta("ajuste", "2026-08-21T10:00:00Z", "aumentar a fonte"),
    ];
    expect(latestApproval(lista)?.comment).toBe("aumentar a fonte");
  });

  it("devolve null sem respostas", () => {
    expect(latestApproval([])).toBeNull();
  });
});

describe("revisionCount", () => {
  it("conta só os pedidos de ajuste", () => {
    const lista = [
      resposta("ajuste", "2026-08-20T10:00:00Z"),
      resposta("ajuste", "2026-08-21T10:00:00Z"),
      resposta("aprovado", "2026-08-22T10:00:00Z"),
    ];
    expect(revisionCount(lista)).toBe(2);
  });

  it("aprovar de primeira é zero ida e volta", () => {
    expect(revisionCount([resposta("aprovado", "2026-08-20T10:00:00Z")])).toBe(
      0
    );
  });
});

describe("rótulos", () => {
  it("cobrem os três estados", () => {
    expect(APPROVAL_LABEL.sem_resposta).toBeTruthy();
    expect(APPROVAL_LABEL.aprovado).toBeTruthy();
    expect(APPROVAL_LABEL.ajuste).toBeTruthy();
  });
});
