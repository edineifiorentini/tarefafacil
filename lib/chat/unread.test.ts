import { describe, expect, it } from "vitest";

import type { ChatMessage, ChatReadState } from "@/types/database";

import {
  badgeLabel,
  groupByDay,
  isContinuation,
  totalUnread,
  unreadByChannel,
} from "./unread";

const EU = "user-1";
const OUTRO = "user-2";
const CANAL = "canal-1";

function msg(partial: Partial<ChatMessage>): ChatMessage {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    channel_id: CANAL,
    author_id: OUTRO,
    kind: "humano",
    body: "oi",
    mentioned_user_ids: [],
    entity_type: null,
    entity_id: null,
    created_at: "2026-08-17T10:00:00Z",
    ...partial,
  } as ChatMessage;
}

function read(channelId: string, at: string): ChatReadState {
  return { channel_id: channelId, user_id: EU, last_read_at: at };
}

describe("unreadByChannel", () => {
  it("conta só o que chegou depois da última leitura", () => {
    const messages = [
      msg({ created_at: "2026-08-17T09:00:00Z" }),
      msg({ created_at: "2026-08-17T11:00:00Z" }),
      msg({ created_at: "2026-08-17T12:00:00Z" }),
    ];
    const unread = unreadByChannel(
      messages,
      [read(CANAL, "2026-08-17T10:00:00Z")],
      EU
    );
    expect(unread.get(CANAL)?.count).toBe(2);
  });

  it("canal nunca aberto conta tudo", () => {
    const messages = [msg({}), msg({})];
    expect(unreadByChannel(messages, [], EU).get(CANAL)?.count).toBe(2);
  });

  it("mensagem própria não conta", () => {
    const messages = [msg({ author_id: EU }), msg({ author_id: OUTRO })];
    expect(unreadByChannel(messages, [], EU).get(CANAL)?.count).toBe(1);
  });

  it("aviso de sistema conta", () => {
    const messages = [
      msg({ author_id: null, kind: "sistema", body: "criou a demanda X" }),
    ];
    expect(unreadByChannel(messages, [], EU).get(CANAL)?.count).toBe(1);
  });

  it("marca o canal quando alguma mensagem menciona você", () => {
    const messages = [
      msg({}),
      msg({ mentioned_user_ids: [EU] }),
    ];
    const u = unreadByChannel(messages, [], EU).get(CANAL);
    expect(u).toEqual({ count: 2, mentionsMe: true });
  });

  it("menção a outra pessoa não destaca o meu canal", () => {
    const messages = [msg({ mentioned_user_ids: [OUTRO] })];
    expect(unreadByChannel(messages, [], EU).get(CANAL)?.mentionsMe).toBe(false);
  });

  it("separa por canal", () => {
    const messages = [
      msg({ channel_id: "a" }),
      msg({ channel_id: "b" }),
      msg({ channel_id: "b" }),
    ];
    const unread = unreadByChannel(messages, [], EU);
    expect(unread.get("a")?.count).toBe(1);
    expect(unread.get("b")?.count).toBe(2);
    expect(totalUnread(unread)).toBe(3);
  });

  it("tudo lido não devolve entrada nenhuma", () => {
    const messages = [msg({ created_at: "2026-08-17T09:00:00Z" })];
    const unread = unreadByChannel(
      messages,
      [read(CANAL, "2026-08-17T10:00:00Z")],
      EU
    );
    expect(unread.size).toBe(0);
    expect(totalUnread(unread)).toBe(0);
  });
});

describe("badgeLabel", () => {
  it("passa de 99 vira 99+", () => {
    expect(badgeLabel(7)).toBe("7");
    expect(badgeLabel(99)).toBe("99");
    expect(badgeLabel(140)).toBe("99+");
  });
});

describe("groupByDay", () => {
  it("inverte para ordem de leitura e agrupa por dia", () => {
    // Chega do mais novo para o mais antigo, como vem da consulta.
    const messages = [
      msg({ body: "c", created_at: "2026-08-17T10:00:00Z" }),
      msg({ body: "b", created_at: "2026-08-16T18:00:00Z" }),
      msg({ body: "a", created_at: "2026-08-16T09:00:00Z" }),
    ];
    const grupos = groupByDay(messages);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].messages.map((m) => m.body)).toEqual(["a", "b"]);
    expect(grupos[1].messages.map((m) => m.body)).toEqual(["c"]);
  });

  it("lista vazia não quebra", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("isContinuation", () => {
  it("mesma pessoa em poucos minutos continua a fala", () => {
    const a = msg({ created_at: "2026-08-17T10:00:00Z" });
    const b = msg({ created_at: "2026-08-17T10:03:00Z" });
    expect(isContinuation(b, a)).toBe(true);
  });

  it("passou da janela, recomeça", () => {
    const a = msg({ created_at: "2026-08-17T10:00:00Z" });
    const b = msg({ created_at: "2026-08-17T10:30:00Z" });
    expect(isContinuation(b, a)).toBe(false);
  });

  it("outra pessoa recomeça", () => {
    const a = msg({ author_id: OUTRO, created_at: "2026-08-17T10:00:00Z" });
    const b = msg({ author_id: EU, created_at: "2026-08-17T10:01:00Z" });
    expect(isContinuation(b, a)).toBe(false);
  });

  it("aviso de sistema nunca se agrupa", () => {
    const a = msg({ kind: "sistema", author_id: null });
    const b = msg({ kind: "sistema", author_id: null, created_at: "2026-08-17T10:01:00Z" });
    expect(isContinuation(b, a)).toBe(false);
  });

  it("primeira mensagem não continua nada", () => {
    expect(isContinuation(msg({}), undefined)).toBe(false);
  });
});
