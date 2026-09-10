"use client";

import {
  IconCheck,
  IconClock,
  IconEyeOff,
  IconHistory,
  IconLoader2,
  IconPencil,
  IconSend,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  ROTULO_DA_VERSAO,
  montarMateriais,
  type Material,
  type SituacaoDaVersao,
  type Versao,
} from "@/lib/aprovacao/ciclo";
import { useTaskApprovals } from "@/lib/queries/useApprovals";
import {
  useAttachments,
  useDeleteAttachment,
  useMarcarEntregavel,
  usePublicarMaterial,
  useSignedUrl,
  useUploadAttachment,
} from "@/lib/queries/useAttachments";
import { useFuso } from "@/lib/queries/useFuso";
import { formatBytes } from "@/lib/utils/file-type";

import { StorageMeter } from "./StorageMeter";

/**
 * O ciclo de aprovação, do rascunho à resposta do cliente.
 *
 * Substitui a lista simples de "entregáveis" que existia aqui. A diferença
 * não é de arrumação: aquela lista respondia "quais arquivos estão
 * marcados", e a pergunta de quem produz é **"em que pé está a peça?"** —
 * que só tem resposta desde a 0093, quando versão, publicação e a resposta
 * do cliente passaram a existir separadamente no banco.
 *
 * O caminho é o que o dono descreveu: envia (nasce rascunho), revisa,
 * escreve o recado, publica. O cliente pede ajuste, você sobe a v02 e
 * publica de novo — e a v01 continua na tela, com o que ele disse sobre
 * ela. É esse rastro que explica por que existe uma v02.
 */
export function ApprovalMaterials({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}) {
  const { data: anexos = [], isPending } = useAttachments(workspaceId, taskId);
  const { data: respostas = [] } = useTaskApprovals(workspaceId, taskId);

  const materiais = montarMateriais(
    anexos.filter((a) => a.para_aprovacao),
    respostas
  );

  if (isPending) {
    return (
      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Carregando…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {materiais.map((m) => (
        <MaterialCard
          key={m.id}
          material={m}
          workspaceId={workspaceId}
          taskId={taskId}
        />
      ))}

      {materiais.length === 0 ? (
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Nenhum material aqui ainda. O que você enviar fica como rascunho até
          você publicar.
        </p>
      ) : null}

      <EnviarMaterial workspaceId={workspaceId} taskId={taskId} />
    </div>
  );
}

// ------------------------------------------------------------- a etiqueta

const CORES: Record<SituacaoDaVersao, string> = {
  // Rascunho não tem cor de propósito: não é um estado do cliente, é a
  // ausência de um. Pintá-lo competiria com o que importa na tela.
  rascunho: "bg-sunken text-fg-secondary",
  aguardando: "bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
  aprovada: "bg-[var(--status-positive-bg)] text-[var(--status-positive-fg)]",
  ajustes: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-fg)]",
  substituida: "bg-sunken text-fg-muted",
};

const ICONES: Record<SituacaoDaVersao, typeof IconCheck> = {
  rascunho: IconEyeOff,
  aguardando: IconClock,
  aprovada: IconCheck,
  ajustes: IconPencil,
  substituida: IconHistory,
};

function Etiqueta({ situacao }: { situacao: SituacaoDaVersao }) {
  const Icone = ICONES[situacao];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium ${CORES[situacao]}`}
    >
      <Icone size={12} stroke={2} aria-hidden />
      {ROTULO_DA_VERSAO[situacao]}
    </span>
  );
}

// ------------------------------------------------------------- a peça

function MaterialCard({
  material,
  workspaceId,
  taskId,
}: {
  material: Material;
  workspaceId: string;
  taskId: string;
}) {
  const fuso = useFuso();
  const abrir = useSignedUrl();
  const publicar = usePublicarMaterial(workspaceId, taskId);
  const tirarDoAr = useMarcarEntregavel(workspaceId, taskId);
  const apagar = useDeleteAttachment(workspaceId, taskId);
  const [mensagem, setMensagem] = useState(
    material.noAr?.mensagemAoCliente ?? ""
  );
  const [erro, setErro] = useState<string | null>(null);

  const { rascunho, noAr } = material;

  async function abrirVersao(v: Versao) {
    setErro(null);
    if (v.kind === "link" && v.externalUrl) {
      window.open(v.externalUrl, "_blank", "noopener");
      return;
    }
    if (!v.storageKey) return;
    try {
      window.open(await abrir(v.storageKey), "_blank", "noopener");
    } catch {
      setErro("Não foi possível abrir o arquivo");
    }
  }

  function publicarRascunho() {
    if (!rascunho) return;
    setErro(null);
    publicar.mutate(
      { id: rascunho.id, mensagem: mensagem.trim() || null },
      {
        onError: (e) =>
          setErro(e instanceof Error ? e.message : "Falha ao publicar"),
      }
    );
  }

  return (
    <section className="border-line bg-card flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <button
            type="button"
            onClick={() => void abrirVersao(material.versoes[0])}
            className="text-fg truncate text-left text-[length:var(--text-small-size)] font-medium"
          >
            {material.nome}
          </button>
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            v{String(material.versoes[0].numero).padStart(2, "0")}
            {material.versoes[0].sizeBytes
              ? ` · ${formatBytes(material.versoes[0].sizeBytes)}`
              : ""}
            {noAr?.publicadoEm
              ? ` · no ar desde ${quando(noAr.publicadoEm, fuso)}`
              : ""}
          </p>
        </div>
        <Etiqueta situacao={material.situacao} />
      </div>

      {/* ---------------------------------------------- publicar o rascunho */}
      {rascunho ? (
        <div className="border-line bg-sunken flex flex-col gap-2 rounded-sm border p-2">
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {noAr
              ? `O cliente ainda vê a v${String(noAr.numero).padStart(2, "0")}. Publicar troca pela v${String(rascunho.numero).padStart(2, "0")}.`
              : "O cliente ainda não vê esta peça."}
          </p>
          <label
            htmlFor={`recado-${material.id}`}
            className="text-fg text-[length:var(--text-caption-size)] font-medium"
          >
            Recado ao cliente
          </label>
          <Textarea
            id={`recado-${material.id}`}
            autogrow
            rows={2}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Opcional — ex.: ajustei o rodapé e troquei a foto"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leadingIcon={IconSend}
              isLoading={publicar.isPending}
              onClick={publicarRascunho}
            >
              Publicar para o cliente
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leadingIcon={IconTrash}
              onClick={() => apagar.mutate(rascunho.id)}
            >
              Descartar rascunho
            </Button>
          </div>
        </div>
      ) : null}

      {/* --------------------------------------------------- o que está no ar */}
      {noAr?.mensagemAoCliente && !rascunho ? (
        <p className="text-fg-secondary border-line border-l-2 pl-2 text-[length:var(--text-small-size)] italic">
          {noAr.mensagemAoCliente}
        </p>
      ) : null}

      {/* ------------------------------------------------------- o histórico */}
      {material.versoes.length > 1 ? (
        <ul className="flex flex-col gap-1.5">
          {material.versoes.map((v) => (
            <li key={v.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void abrirVersao(v)}
                  className="text-fg-secondary hover:text-fg tnum shrink-0 text-[length:var(--text-caption-size)] font-medium"
                >
                  v{String(v.numero).padStart(2, "0")}
                </button>
                <Etiqueta situacao={v.situacao} />
                <span className="text-fg-muted truncate text-[length:var(--text-caption-size)]">
                  {v.resposta
                    ? `${v.resposta.autor ?? "Cliente"} · ${quando(v.resposta.em, fuso)}`
                    : v.publicadoEm
                      ? quando(v.publicadoEm, fuso)
                      : "não publicada"}
                </span>
              </div>
              {v.resposta?.comentario ? (
                <p className="text-fg-secondary border-line ml-2 border-l-2 pl-2 text-[length:var(--text-caption-size)] whitespace-pre-wrap">
                  {v.resposta.comentario}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {erro}
        </p>
      ) : null}

      {/* ---------------------------------------------------------- ações */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sem nada publicado, o caminho é descartar o rascunho e enviar
            outro — não existe "próxima versão" de uma peça que o cliente
            nunca viu. */}
        {material.jaPublicou ? (
          <NovaVersao
            material={material}
            workspaceId={workspaceId}
            taskId={taskId}
          />
        ) : null}
        {noAr ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leadingIcon={IconEyeOff}
            onClick={() => tirarDoAr.mutate({ id: noAr.id, entregavel: false })}
          >
            Tirar do ar
          </Button>
        ) : null}
      </div>
    </section>
  );
}

// -------------------------------------------------------- enviar arquivo

/**
 * Subir a correção de uma peça que já existe.
 *
 * O arquivo entra como versão SEGUINTE do mesmo material e nasce rascunho —
 * o cliente continua vendo a versão publicada até alguém apertar publicar.
 * É o que faz "aprovou a v01" continuar verdadeiro enquanto a v02 é
 * revisada por dentro.
 */
function NovaVersao({
  material,
  workspaceId,
  taskId,
}: {
  material: Material;
  workspaceId: string;
  taskId: string;
}) {
  const { upload } = useUploadAttachment(workspaceId, taskId);
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function receber(arquivo: File) {
    setErro(null);
    setEnviando(true);
    try {
      await upload(arquivo, () => {}, {
        paraAprovacao: true,
        material: { id: material.id, proximaVersao: material.proximaVersao },
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no envio");
    }
    setEnviando(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leadingIcon={IconUpload}
        isLoading={enviando}
        onClick={() => entrada.current?.click()}
      >
        Enviar v{String(material.proximaVersao).padStart(2, "0")}
      </Button>
      <input
        ref={entrada}
        type="file"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) void receber(arquivo);
          e.target.value = "";
        }}
      />
      {erro ? (
        <span
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {erro}
        </span>
      ) : null}
    </>
  );
}

/** A primeira versão de uma peça nova. */
function EnviarMaterial({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}) {
  const { upload } = useUploadAttachment(workspaceId, taskId);
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  async function receber(arquivos: FileList | File[]) {
    setErro(null);
    for (const arquivo of Array.from(arquivos)) {
      setEnviando(arquivo.name);
      try {
        await upload(arquivo, () => {}, { paraAprovacao: true });
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha no envio");
        break;
      }
    }
    setEnviando(null);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        void receber(e.dataTransfer.files);
      }}
      className={`flex flex-col gap-2 rounded-md border border-dashed p-2 transition-colors [transition-duration:var(--dur-fast)] ${
        arrastando ? "border-line-strong bg-sunken" : "border-line"
      }`}
    >
      {enviando ? (
        <p className="text-fg-secondary flex items-center gap-2 text-[length:var(--text-caption-size)]">
          <IconLoader2 size={12} className="animate-spin" aria-hidden />
          <span className="truncate">{enviando}</span>
        </p>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {erro}
        </p>
      ) : null}

      <StorageMeter workspaceId={workspaceId} />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leadingIcon={IconUpload}
          onClick={() => entrada.current?.click()}
        >
          Enviar material
        </Button>
        <input
          ref={entrada}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void receber(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-fg-muted text-[length:var(--text-caption-size)]">
          ou arraste aqui — entra como rascunho
        </span>
      </div>
    </div>
  );
}

/**
 * "10/09 às 14:32" no fuso de quem lê (§15).
 *
 * O painel é do time, e o time pode estar em qualquer lugar; a preferência
 * salva em `app_user.timezone` é que manda, e não o relógio do aparelho.
 */
function quando(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
