"use client";

import {
  IconExternalLink,
  IconFile,
  IconFileTypePdf,
  IconLink,
  IconLoader2,
  IconPaperclip,
  IconPhoto,
  IconTrash,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import {
  useAddAttachmentLink,
  useAttachments,
  useDeleteAttachment,
  useSignedUrl,
  useUploadAttachment,
} from "@/lib/queries/useAttachments";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { formatBytes } from "@/lib/utils/file-type";
import type { Attachment } from "@/types/database";

function iconFor(a: Attachment) {
  if (a.kind === "link") return IconLink;
  const mime = a.mime_type ?? "";
  if (mime.startsWith("image/")) return IconPhoto;
  if (mime === "application/pdf") return IconFileTypePdf;
  return IconFile;
}

export function AttachmentList({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: attachments = [] } = useAttachments(workspace.id, taskId);
  const { upload } = useUploadAttachment(workspace.id, taskId);
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
        const Icon = iconFor(a);
        return (
          <div key={a.id} className="group flex items-center gap-2">
            <button
              type="button"
              onClick={() => void openAttachment(a)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Icon size={16} stroke={1.5} className="shrink-0 text-fg-muted" />
              <span className="truncate text-[length:var(--text-small-size)] text-fg">
                {a.filename}
              </span>
              {a.kind === "file" && a.size_bytes ? (
                <span className="shrink-0 text-[length:var(--text-caption-size)] text-fg-muted">
                  {formatBytes(a.size_bytes)}
                </span>
              ) : null}
              {a.kind === "link" ? (
                <IconExternalLink
                  size={12}
                  stroke={1.5}
                  className="shrink-0 text-fg-muted"
                />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => del.mutate(a.id)}
              aria-label={`Remover ${a.filename}`}
              className="text-fg-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
            >
              <IconTrash size={14} stroke={1.5} />
            </button>
          </div>
        );
      })}

      {uploading ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[length:var(--text-caption-size)] text-fg-secondary">
            <IconLoader2 size={12} className="animate-spin" aria-hidden />
            <span className="truncate">{uploading.name}</span>
            <span className="tnum ml-auto">
              {Math.round(uploading.progress * 100)}%
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-sunken">
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
          className="flex items-center gap-2 text-[length:var(--text-caption-size)] text-overdue"
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
        <span className="text-[length:var(--text-caption-size)] text-fg-muted">
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
      <p className="text-[length:var(--text-caption-size)] text-fg-muted">
        Links do Drive: o app não gerencia a permissão — quem abrir precisa ter
        acesso.
      </p>
    </div>
  );
}
