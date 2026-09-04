"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  IconArrowsMaximize,
  IconChevronLeft,
  IconChevronRight,
  IconArchive,
  IconFileUnknown,
  IconMaximize,
  IconMinus,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react";

import { textoDoArquivoRetirado } from "@/lib/storage/quota";
import type { PublicDeliverable } from "@/lib/share/publicTask";

/**
 * A prévia da peça — o elemento mais importante desta página.
 *
 * COMO O ARQUIVO CHEGA AQUI, e por que assim:
 *
 * Nenhum endereço de storage entra no HTML. O que existe é
 * `/api/d/{token}/anexo/{id}`, uma rota que confere o token de novo, checa
 * que o anexo é daquela demanda, que está marcado como entregável e que é
 * da mesma empresa — e só então redireciona para uma URL assinada de cinco
 * minutos. O endereço que o navegador recebe morre sozinho.
 *
 * SOBRE A MARCA D'ÁGUA, e é preciso ser exato: ela é uma camada de CSS,
 * removível por quem abrir o inspetor. Ela sinaliza "isto é prévia, não
 * está aprovado" para quem for compartilhar a tela ou tirar um print — que
 * é o caso real. **Não é proteção contra cópia**, e não deve ser descrita
 * como tal. Proteção de verdade seria gerar uma derivada marcada no
 * servidor, em resolução menor; isso não existe no projeto e está
 * registrado no roadmap.
 */

export function MediaPreview({
  token,
  arquivo,
  indice,
  total,
  aprovado,
  onAnterior,
  onProximo,
}: {
  token: string;
  arquivo: PublicDeliverable;
  indice: number;
  total: number;
  /** Depois de aprovado a marca d'água sai — a peça deixou de ser prévia. */
  aprovado: boolean;
  onAnterior: () => void;
  onProximo: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const palco = useRef<HTMLDivElement>(null);

  const src = `/api/d/${token}/anexo/${arquivo.id}${tentativa ? `?r=${tentativa}` : ""}`;

  // Trocar de arquivo zera o zoom e o erro: manter 250% ao passar para a
  // próxima peça faria a pessoa aterrissar num pedaço aleatório dela.
  const [ultimoId, setUltimoId] = useState(arquivo.id);
  if (arquivo.id !== ultimoId) {
    setUltimoId(arquivo.id);
    setZoom(1);
    setErro(false);
  }

  const temZoom = arquivo.tipo === "imagem" || arquivo.tipo === "pdf";

  const telaCheia = useCallback(() => {
    const el = palco.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  // Setas do teclado andam entre as peças quando o palco tem foco. É a
  // navegação que quem revisa espera, e não custa um controle novo na tela.
  useEffect(() => {
    const el = palco.current;
    if (!el || total < 2) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onAnterior();
      if (e.key === "ArrowRight") onProximo();
    };
    el.addEventListener("keydown", aoTeclar);
    return () => el.removeEventListener("keydown", aoTeclar);
  }, [total, onAnterior, onProximo]);

  return (
    <section className="flex flex-col">
      <header className="ap-card-topo flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <h2 className="ap-titulo-card mr-auto">Prévia do material</h2>

        {total > 1 ? (
          <div className="flex items-center gap-1">
            <span className="ap-meta tnum mr-1">
              {indice + 1} de {total}
            </span>
            <Controle
              icone={IconChevronLeft}
              rotulo="Material anterior"
              onClick={onAnterior}
            />
            <Controle
              icone={IconChevronRight}
              rotulo="Próximo material"
              onClick={onProximo}
            />
          </div>
        ) : null}

        {temZoom ? (
          <div className="flex items-center gap-1">
            <Controle
              icone={IconMinus}
              rotulo="Diminuir zoom"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            />
            <span className="ap-meta tnum w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Controle
              icone={IconPlus}
              rotulo="Aumentar zoom"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            />
            <Controle
              icone={IconMaximize}
              rotulo="Ajustar à tela"
              onClick={() => setZoom(1)}
            />
          </div>
        ) : null}

        <Controle
          icone={IconArrowsMaximize}
          rotulo="Tela cheia"
          onClick={telaCheia}
        />
      </header>

      <div
        ref={palco}
        tabIndex={-1}
        className="ap-palco relative flex min-h-[22rem] items-center justify-center overflow-auto outline-none"
      >
        {erro ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="ap-texto">Não foi possível carregar a prévia.</p>
            <button
              type="button"
              onClick={() => {
                setErro(false);
                setTentativa((t) => t + 1);
              }}
              className="ap-botao-fantasma inline-flex items-center gap-2"
            >
              <IconRefresh size={15} stroke={1.75} aria-hidden />
              Tentar novamente
            </button>
          </div>
        ) : (
          <Conteudo
            arquivo={arquivo}
            src={src}
            zoom={zoom}
            onErro={() => setErro(true)}
          />
        )}

        {/* A marca d'água. Camada de CSS, e o comentário no topo do arquivo
            diz por que ela NÃO é proteção contra cópia. */}
        {!aprovado && !erro && arquivo.tipo !== "outro" ? (
          <span aria-hidden className="ap-marca-dagua">
            PRÉVIA · NÃO APROVADO
          </span>
        ) : null}
      </div>
    </section>
  );
}

function Conteudo({
  arquivo,
  src,
  zoom,
  onErro,
}: {
  arquivo: PublicDeliverable;
  src: string;
  zoom: number;
  onErro: () => void;
}) {
  // O arquivo cumpriu o prazo no servidor (0086). Vem ANTES do switch: sem
  // isto o player tentaria carregar, levaria um 410 e cairia no estado de
  // erro genérico — que diz "não foi possível carregar" e faz o cliente
  // recarregar a página achando que é problema dele.
  if (arquivo.retiradoEm) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <IconArchive
          size={26}
          stroke={1.5}
          aria-hidden
          className="ap-icone-fraco"
        />
        <p className="ap-texto max-w-sm">
          {textoDoArquivoRetirado(arquivo.retiradoEm)}
        </p>
        <p className="ap-meta break-all">{arquivo.filename}</p>
      </div>
    );
  }

  switch (arquivo.tipo) {
    case "imagem":
      return (
        /* eslint-disable-next-line @next/next/no-img-element -- a rota
           devolve um 302 para uma URL assinada; o otimizador do Next não
           consegue processá-la, e forçá-lo faria o arquivo passar pelo
           servidor da aplicação. */
        <img
          src={src}
          alt={`Prévia de ${arquivo.filename}`}
          onError={onErro}
          draggable={false}
          style={{ transform: `scale(${zoom})` }}
          className="max-h-[68vh] origin-center object-contain transition-transform [transition-duration:var(--dur-base)]"
        />
      );

    case "video":
      return (
        <video
          src={src}
          controls
          // Só o cabeçalho, não o arquivo. Sem isto o player abre marcando
          // "0:00 / 0:00" e a duração só aparece depois do primeiro play —
          // o cliente não consegue saber se o vídeo tem 8 segundos ou 4
          // minutos antes de se comprometer a assistir.
          preload="metadata"
          // `nodownload` esconde o item do menu do player. Está aqui por
          // conveniência, não por segurança — o comentário no topo explica
          // qual é a proteção de verdade.
          controlsList="nodownload"
          onError={onErro}
          className="max-h-[68vh] w-full"
        >
          Seu navegador não reproduz este vídeo.
        </video>
      );

    case "audio":
      return (
        <div className="flex w-full max-w-xl flex-col gap-4 px-6 py-12">
          <p className="ap-texto text-center break-all">{arquivo.filename}</p>
          <audio
            src={src}
            controls
            preload="metadata"
            controlsList="nodownload"
            onError={onErro}
            className="w-full"
          >
            Seu navegador não reproduz este áudio.
          </audio>
        </div>
      );

    case "pdf":
      return (
        // `<object>` e não `<iframe>`: com `<object>` o navegador cai no
        // conteúdo alternativo quando não sabe desenhar PDF, em vez de
        // mostrar um retângulo cinza sem explicação.
        <object
          data={src}
          type="application/pdf"
          className="h-[68vh] w-full"
          style={{ zoom }}
          aria-label={`Prévia de ${arquivo.filename}`}
        >
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <p className="ap-texto">
              Seu navegador não consegue exibir este PDF aqui dentro.
            </p>
            <p className="ap-meta">
              O arquivo ficará disponível para download após a aprovação.
            </p>
          </div>
        </object>
      );

    case "outro":
      return (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <IconFileUnknown
            size={32}
            stroke={1.5}
            aria-hidden
            className="ap-icone-fraco"
          />
          <p className="ap-texto">
            Este formato não possui visualização disponível.
          </p>
          <p className="ap-meta break-all">
            {arquivo.filename}
            {arquivo.sizeBytes ? ` · ${tamanho(arquivo.sizeBytes)}` : ""}
          </p>
        </div>
      );
  }
}

function Controle({
  icone: Icone,
  rotulo,
  onClick,
}: {
  icone: typeof IconPlus;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className="ap-controle"
    >
      <Icone size={16} stroke={1.75} aria-hidden />
    </button>
  );
}

/** "2,4 MB". Só para exibir — não autoriza nada. */
export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}
