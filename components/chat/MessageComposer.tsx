"use client";

import { IconAt, IconSend, IconTag, IconX } from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useSendMessage } from "@/lib/queries/useChat";
import {
  useCurrentUserId,
  useMembers,
  type Member,
} from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import type { ChatMessage } from "@/types/database";

const menuContent =
  "z-50 max-h-64 min-w-44 overflow-auto rounded-md tf-glass-strong p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]";
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-hover";

/**
 * Menção é escolhida num menu, não parseada do texto — mesmo critério dos
 * comentários da demanda. Parsear "@fulano" erra em nome composto, em
 * apelido repetido e quando alguém escreve um e-mail.
 */
export function MessageComposer({
  workspaceId,
  channelId,
  channelName,
  replyTo,
  onCancelReply,
}: {
  workspaceId: string;
  channelId: string;
  channelName: string;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
}) {
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspaceId);
  const { data: sectors = [] } = useSectors(workspaceId);
  const send = useSendMessage(workspaceId, channelId);
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<string[]>([]);
  // Etiqueta de assunto: opcional, e some depois de enviar — carregar a
  // etiqueta anterior para a próxima mensagem etiquetaria coisa errada.
  const [sectorId, setSectorId] = useState<string | null>(null);
  const setorEscolhido = sectors.find((x) => x.id === sectorId);

  // Não faz sentido se mencionar: o trigger ignora e a lista polui.
  const mencionaveis = members.filter(
    (m) => m.user_id !== myId && m.status === "active"
  );

  function mention(m: Member) {
    const nome = m.display_name ?? m.email;
    setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${nome} `);
    setMentioned((ids) => (ids.includes(m.user_id) ? ids : [...ids, m.user_id]));
  }

  function submit() {
    const texto = body.trim();
    if (!texto || send.isPending) return;
    // Só vai como menção quem continua citado no texto final.
    const citados = mentioned.filter((id) => {
      const m = members.find((x) => x.user_id === id);
      const nome = m?.display_name ?? m?.email ?? "";
      return nome && texto.includes(`@${nome}`);
    });
    send.mutate(
      {
        body: texto,
        mentionedUserIds: citados,
        replyToId: replyTo?.id ?? null,
        sectorId,
      },
      {
        onSuccess: () => {
          setBody("");
          setMentioned([]);
          setSectorId(null);
          onCancelReply();
        },
      }
    );
  }

  const autorCitado = replyTo?.author_id
    ? (members.find((m) => m.user_id === replyTo.author_id)?.display_name ??
      "Alguém")
    : "Aviso";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-line flex flex-col gap-2 border-t p-3"
    >
      {replyTo ? (
        <div className="bg-sunken flex items-start gap-2 rounded-sm px-2 py-1.5">
          <div className="border-line min-w-0 flex-1 border-l-2 pl-2">
            <p className="text-fg-secondary text-[length:var(--text-caption-size)] font-medium whitespace-nowrap">
              Respondendo {autorCitado}
            </p>
            <p className="text-fg-muted truncate text-[length:var(--text-caption-size)]">
              {replyTo.body}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cancelar resposta"
            onClick={onCancelReply}
            className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs transition-colors [transition-duration:var(--dur-fast)]"
          >
            <IconX size={14} stroke={1.75} />
          </button>
        </div>
      ) : null}

      <Textarea
        autogrow
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // Enter envia, Shift+Enter quebra linha — o que se espera de um chat.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape" && replyTo) onCancelReply();
        }}
        placeholder={`Escreva em ${channelName}…`}
        aria-label={`Nova mensagem em ${channelName}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-2 text-[length:var(--text-caption-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)]"
            >
              <IconAt size={14} stroke={1.5} />
              Mencionar
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={4}
              className={menuContent}
            >
              {mencionaveis.length === 0 ? (
                <div className="text-fg-muted px-2 py-1.5 text-[length:var(--text-small-size)]">
                  Ninguém para mencionar
                </div>
              ) : (
                mencionaveis.map((m) => (
                  <DropdownMenu.Item
                    key={m.user_id}
                    onSelect={() => mention(m)}
                    className={menuItem}
                  >
                    {m.display_name ?? m.email}
                  </DropdownMenu.Item>
                ))
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-2 text-[length:var(--text-caption-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] ${
                setorEscolhido
                  ? "text-fg-link bg-selected font-medium"
                  : "text-fg-secondary hover:bg-hover hover:text-fg"
              }`}
            >
              <IconTag size={14} stroke={1.5} />
              {setorEscolhido ? setorEscolhido.name : "Etiqueta"}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={4}
              className={menuContent}
            >
              {setorEscolhido ? (
                <DropdownMenu.Item
                  onSelect={() => setSectorId(null)}
                  className={menuItem}
                >
                  Sem etiqueta
                </DropdownMenu.Item>
              ) : null}
              {sectors.map((setor) => (
                <DropdownMenu.Item
                  key={setor.id}
                  onSelect={() => setSectorId(setor.id)}
                  className={menuItem}
                >
                  {setor.name}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Button
          type="submit"
          size="sm"
          variant="primary"
          className="ml-auto"
          leadingIcon={IconSend}
          disabled={!body.trim()}
          isLoading={send.isPending}
        >
          Enviar
        </Button>
      </div>
    </form>
  );
}
