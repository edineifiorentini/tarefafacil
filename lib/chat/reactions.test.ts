import { describe, expect, it } from "vitest";

import type { ChatMessageReaction } from "@/types/database";

import { groupReactions, reactionsByMessage, REACTIONS } from "./reactions";

function reacao(
  emoji: string,
  user_id: string,
  message_id = "m1"
): ChatMessageReaction {
  return {
    message_id,
    user_id,
    emoji,
    workspace_id: "w1",
    channel_id: "c1",
    created_at: "2026-08-21T10:00:00Z",
  };
}

describe("groupReactions", () => {
  it("conta quantas pessoas deram cada reação", () => {
    const r = groupReactions(
      [reacao("👍", "a"), reacao("👍", "b"), reacao("❤️", "c")],
      null
    );
    expect(r).toEqual([
      { emoji: "👍", count: 2, mine: false },
      { emoji: "❤️", count: 1, mine: false },
    ]);
  });

  it("marca a minha reação", () => {
    const r = groupReactions([reacao("👍", "eu"), reacao("👍", "outro")], "eu");
    expect(r[0]).toEqual({ emoji: "👍", count: 2, mine: true });
  });

  it("não marca como minha a reação de outra pessoa no mesmo emoji", () => {
    const r = groupReactions([reacao("😂", "outro")], "eu");
    expect(r[0].mine).toBe(false);
  });

  it("mantém a ordem do vocabulário, não a de contagem", () => {
    // 🙏 tem mais gente, mas 👍 vem antes na lista: ficha que pula de lugar
    // faz a pessoa clicar no emoji errado.
    const r = groupReactions(
      [
        reacao("🙏", "a"),
        reacao("🙏", "b"),
        reacao("🙏", "c"),
        reacao("👍", "d"),
      ],
      null
    );
    expect(r.map((x) => x.emoji)).toEqual(["👍", "🙏"]);
  });

  it("põe emoji desconhecido no fim em vez de sumir com ele", () => {
    const r = groupReactions([reacao("🦄", "a"), reacao("👍", "b")], null);
    expect(r.map((x) => x.emoji)).toEqual(["👍", "🦄"]);
  });

  it("devolve lista vazia sem reação nenhuma", () => {
    expect(groupReactions([], "eu")).toEqual([]);
  });
});

describe("reactionsByMessage", () => {
  it("separa por mensagem", () => {
    const mapa = reactionsByMessage(
      [
        reacao("👍", "a", "m1"),
        reacao("👍", "b", "m1"),
        reacao("😢", "a", "m2"),
      ],
      "a"
    );
    expect(mapa.get("m1")).toEqual([{ emoji: "👍", count: 2, mine: true }]);
    expect(mapa.get("m2")).toEqual([{ emoji: "😢", count: 1, mine: true }]);
    expect(mapa.get("m3")).toBeUndefined();
  });
});

describe("vocabulário", () => {
  it("tem sete opções, sem repetidos", () => {
    expect(REACTIONS).toHaveLength(7);
    expect(new Set(REACTIONS).size).toBe(7);
  });

  it("usa o coração com seletor de variação, como o check da 0055", () => {
    // "❤" sozinho (U+2764) é um emoji diferente de "❤️" (U+2764 U+FE0F) e
    // seria recusado pelo banco.
    expect(REACTIONS).toContain("❤️");
  });
});
