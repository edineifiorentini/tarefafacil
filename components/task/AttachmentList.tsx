"use client";

import {
  IconExternalLink,
  IconFile,
  IconFileTypePdf,
  IconLink,
  IconLoader2,
  IconPaperclip,
  IconPhoto,
  IconEye,
  IconTrash,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { HoverCard } from "radix-ui";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import {
  useAddAttachmentLink,
  useAttachmentImageUrl,
  useAttachments,
  useDeleteAttachment,
  useMarcarEntregavel,
  useSignedUrl,
  useUploadAttachment,
} from "@/lib/queries/useAttachments";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { formatBytes } from "@/lib/utils/file-type";
import type { Attachment } from "@/types/database";

function isImage(a: Attachment) {
  return a.kind === "file" && (a.mime_type ?? "").startsWith("image/");
}

function iconFor(a: Attachment) {
  if (a.kind === "link") return IconLink;
  const mime = a.mime_type ?? "";
  if (mime.startsWith("image/")) return IconPhoto;
  if (mime === "application/pdf") return IconFileTypePdf;
  return IconFile;
}

function ImageAttachmentRow({
  attachment,
  onOpen,
  onDelete,
  onToggleEntregavel,
}: {
  attachment: Attachment;
  onOpen: () => void;
  onDelete: () => void;
  /** Imagem é o que o criativo costuma ser — sem isto o botão faltaria
      justamente no arquivo que mais precisa dele. */
  onToggleEntregavel: () => void;
}) {
  const { data: url, isError } = useAttachmentImageUrl(
    attachment.storage_key,
    true
  );

  return (
    <div className="group flex items-center gap-2">
      <HoverCard.Root openDelay={300} closeDelay={120}>
        <HoverCard.Trigger asChild>
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {url && !isError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                className="h-7 w-7 shrink-0 rounded-sm object-cover"
              />
            ) : isError ? (
              <IconPhoto
                size={16}
                stroke={1.5}
                className="text-fg-muted mx-1.5 shrink-0"
              />
            ) : (
              <span className="bg-sunken h-7 w-7 shrink-0 animate-pulse rounded-sm" />
            )}
            <span className="text-fg truncate text-[length:var(--text-small-size)]">
              {attachment.filename}
            </span>
            {attachment.size_bytes ? (
              <span className="text-fg-muted shrink-0 text-[length:var(--text-caption-size)]">
                {formatBytes(attachment.size_bytes)}
              </span>
            ) : null}
          </button>
        </HoverCard.Trigger>
        {url && !isError ? (
          <HoverCard.Portal>
            <HoverCard.Content side="right" sideOffset={8} className="z-50">
              <div className="border-line bg-card overflow-hidden rounded-md border p-1 shadow-[var(--shadow-peek)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={attachment.filename}
                  className="max-h-64 max-w-xs rounded-sm object-contain"
                />
              </div>
            </HoverCard.Content>
          </HoverCard.Portal>
        ) : null}
      </HoverCard.Root>
      <button
        type="button"
        onClick={onToggleEntregavel}
        aria-pressed={attachment.entregavel}
        title={
          attachment.entregavel
            ? "O cliente vê esta imagem no link público"
            : "Mostrar ao cliente no link público"
        }
        aria-label={`${attachment.entregavel ? "Ocultar do" : "Mostrar no"} link do cliente: ${attachment.filename}`}
        className={`shrink-0 transition-opacity ${
          attachment.entregavel
            ? "text-fg-link opacity-100"
            : "text-fg-muted hover:text-fg opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        }`}
      >
        <IconEye size={14} stroke={1.5} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remover ${attachment.filename}`}
        className="text-fg-muted hover:text-fg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <IconTrash size={14} stroke={1.5} />
      </button>
    </div>
  );
}

export function AttachmentList({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: attachments = [] } = useAttachments(workspace.id, taskId);
  const { upload } = useUploadAttachment(workspace.id, taskId);
  const marcar = useMarcarEntregavel(workspace.id, taskId);
  const addLink = useAddAttachmentLink(workspace.id, taskId);
  const del = useDeleteAttachment(workspace.id, taskId);
  const signedUrl = useSignedUrl();

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{
    name: string;
    progress: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    for (const file of Array.from(files)) {
      setUploading({ name: file.name, progress: 0 });
      try {
        await upload(file, (p) =>
          setUploading({ name: file.name, progress: p })
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no upload");
        break;
      }
    }
    setUploading(null);
  }

  async function openAttachment(a: Attachment) {
    setError(null);
    if (a.kind === "link" && a.external_url) {
      window.open(a.external_url, "_blank", "noopener");
      return;
    }
    if (a.storage_key) {
      try {
        const url = await signedUrl(a.storage_key);
        window.open(url, "_blank", "noopener");
      } catch {
        setError("Não foi possível abrir o anexo");
      }
    }
  }

  function submitLink(e: FormEvent) {
    e.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;
    let filename = url;
    try {
      filename = new URL(url).hostname;
    } catch {
      // mantém a url como nome
    }
    addLink.mutate({ url, filename });
    setLinkUrl("");
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col gap-2 rounded-md border border-dashed p-2 transition-colors [transition-duration:var(--dur-fast)] ${
        dragOver ? "border-line-strong bg-sunken" : "border-line"
      }`}
    >
      {attachments.map((a) => {
        if (isImage(a)) {
          return (
            <ImageAttachmentRow
              key={a.id}
              attachment={a}
              onOpen={() => void openAttachment(a)}
              onDelete={() => del.mutate(a.id)}
              onToggleEntregavel={() =>
                marcar.mutate({ id: a.id, entregavel: !a.entregavel })
              }
            />
          );
        }
        const Icon = iconFor(a);
        return (
          <div key={a.id} className="group flex items-center gap-2">
            <button
              type="button"
              onClick={() => void openAttachment(a)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Icon size={16} stroke={1.5} className="text-fg-muted shrink-0" />
              <span className="text-fg truncate text-[length:var(--text-small-size)]">
                {a.filename}
              </span>
              {a.kind === "file" && a.size_bytes ? (
                <span className="text-fg-muted shrink-0 text-[length:var(--text-caption-size)]">
                  {formatBytes(a.size_bytes)}
                </span>
              ) : null}
              {a.kind === "link" ? (
                <IconExternalLink
                  size={12}
                  stroke={1.5}
                  className="text-fg-muted shrink-0"
                />
              ) : null}
            </button>
            {/* Só arquivo: link externo já é público por natureza, e o
                cliente pode abri-lo sem nós no meio. */}
            {a.kind === "file" ? (
              <button
                type="button"
                onClick={() =>
                  marcar.mutate({ id: a.id, entregavel: !a.entregavel })
                }
                aria-pressed={a.entregavel}
                title={
                  a.entregavel
                    ? "O cliente vê este arquivo no link público"
                    : "Mostrar ao cliente no link público"
                }
                aria-label={`${a.entregavel ? "Ocultar do" : "Mostrar no"} link do cliente: ${a.filename}`}
                className={`shrink-0 transition-opacity ${
                  a.entregavel
                    ? "text-fg-link opacity-100"
                    : "text-fg-muted hover:text-fg opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                }`}
              >
                <IconEye size={14} stroke={1.5} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => del.mutate(a.id)}
              aria-label={`Remover ${a.filename}`}
              className="text-fg-muted hover:text-fg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <IconTrash size={14} stroke={1.5} />
            </button>
          </div>
        );
      })}

      {uploading ? (
        <div className="flex flex-col gap-1">
          <div className="text-fg-secondary flex items-center gap-2 text-[length:var(--text-caption-size)]">
            <IconLoader2 size={12} className="animate-spin" aria-hidden />
            <span className="truncate">{uploading.name}</span>
            <span className="tnum ml-auto">
              {Math.round(uploading.progress * 100)}%
            </span>
          </div>
          <div className="bg-sunken h-1 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--fill-brand)]"
              style={{ width: `${uploading.progress * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="text-overdue flex items-center gap-2 text-[length:var(--text-caption-size)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="underline"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leadingIcon={IconPaperclip}
          onClick={() => inputRef.current?.click()}
        >
          Anexar
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-fg-muted text-[length:var(--text-caption-size)]">
          ou arraste aqui
        </span>
      </div>

      <form onSubmit={submitLink} className="flex items-center gap-2">
        <TextInput
          size="sm"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Colar link (ex.: Drive)"
          aria-label="Link de anexo"
        />
        <Button type="submit" variant="ghost" size="sm">
          Link
        </Button>
      </form>
      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Links do Drive: o app não gerencia a permissão — quem abrir precisa ter
        acesso.
      </p>
    </div>
  );
}
