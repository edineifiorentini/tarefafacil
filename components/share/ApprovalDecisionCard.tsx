"use client";

import { useState } from "react";

import { IconCheck, IconPencil, IconShieldCheck } from "@tabler/icons-react";
import { AlertDialog } from "radix-ui";

import { createClient } from "@/lib/supabase/client";

type Decisao = "aprovado" | "ajuste";

/**
 * A resposta do cliente.
 *
 * Quem abre não tem conta e não vai criar uma para dizer "pode publicar". A
 * chamada vai para `record_task_approval`, que valida o token DENTRO do
 * banco — esta tela não tem, e não pode ter, permissão de escrever em
 * tabela nenhuma. A função também descarta repetição do mesmo veredito
 * dentro de um minuto, o que torna clique duplo e recarregar inofensivos.
 *
 * **O nome continua opcional, e isso é uma limitação conhecida.** O modelo
 * atual (0064) o trata como cortesia para quem lê depois, não como
 * identificação — e não há nada que prove quem clicou, já que o link é
 * anônimo por natureza. Exigir o nome daria uma sensação de prova que a
 * implementação não sustenta. O campo pede o nome de forma clara; tornar
 * obrigatório é decisão de produto, registrada no roadmap.
 *
 * **Aprovar pede confirmação.** É a única ação da página sem volta pela
 * interface, e o diálogo diz exatamente o que será aprovado.
 */
export function ApprovalDecisionCard({
  token,
  demanda,
  totalDeMateriais,
  ultimaDecisao,
  ultimaEm,
}: {
  token: string;
  /** O nome da demanda, para a confirmação não ser genérica. */
  demanda: string;
  /**
   * Quantos arquivos entram nesta aprovação.
   *
   * **A aprovação é da DEMANDA, não de um arquivo.**
   * `record_task_approval` recebe token e veredito — não recebe id de
   * anexo. Escrever "aprovando a Campanha Rádio" seria descrever uma
   * granularidade que o banco não tem, e o cliente acharia que os outros
   * arquivos ficaram de fora.
   */
  totalDeMateriais: number;
  ultimaDecisao: Decisao | null;
  ultimaEm: string | null;
}) {
  const [nome, setNome] = useState("");
  const [comentario, setComentario] = useState("");
  const [pedindoAjuste, setPedindoAjuste] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<Decisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(decisao: Decisao) {
    if (enviando) return;
    if (decisao === "ajuste" && !comentario.trim()) {
      setErro("Escreva o que precisa mudar.");
      return;
    }
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("record_task_approval", {
      p_token: token,
      p_decision: decisao,
      p_comment: comentario.trim() || null,
      p_author: nome.trim() || null,
    });

    setEnviando(false);
    setConfirmando(false);

    if (error || data === false) {
      setErro(
        "Não foi possível registrar. O link pode ter expirado — peça um novo a quem enviou."
      );
      return;
    }
    setPronto(decisao);
  }

  // ------------------------------------------------------------ resposta
  if (pronto) {
    return (
      <section role="status" className="ap-card p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              background:
                pronto === "aprovado"
                  ? "color-mix(in srgb, var(--ap-lime) 18%, transparent)"
                  : "var(--ap-superficie-alta)",
              color:
                pronto === "aprovado" ? "var(--ap-lime)" : "var(--ap-tinta-2)",
            }}
          >
            {pronto === "aprovado" ? (
              <IconCheck size={18} stroke={2.5} />
            ) : (
              <IconPencil size={16} stroke={2} />
            )}
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[length:var(--text-small-size)] font-medium">
              {pronto === "aprovado"
                ? "Aprovação registrada"
                : "Pedido de ajustes enviado"}
            </p>
            <p className="ap-meta">
              Quem cuida desta demanda já foi avisado
              {nome.trim() ? `, em nome de ${nome.trim()}` : ""}.
            </p>
          </div>
        </div>

        {/* Nenhum botão de download aqui. A liberação do arquivo final
            depende de o sistema saber QUAL versão foi aprovada, e o modelo
            atual não guarda versão de anexo — está no roadmap. Prometer o
            download e não entregar seria pior que não prometer. */}
      </section>
    );
  }

  // ----------------------------------------------------------- formulário
  return (
    <section className="ap-card p-5">
      <h2 className="mb-1 text-[length:var(--text-h3-size)] font-semibold">
        O que você achou?
      </h2>
      <p className="ap-meta mb-4">
        Sua resposta vai direto para quem está cuidando desta demanda.
      </p>

      {ultimaDecisao ? (
        <p
          className="ap-meta mb-4 rounded-[10px] px-3 py-2"
          style={{ background: "var(--ap-superficie-alta)" }}
        >
          Você já respondeu{" "}
          <strong style={{ color: "var(--ap-tinta)", fontWeight: 600 }}>
            {ultimaDecisao === "aprovado" ? "aprovando" : "pedindo ajustes"}
          </strong>
          {ultimaEm ? ` em ${ultimaEm}` : ""}. Pode responder de novo se algo
          mudou.
        </p>
      ) : null}

      <label htmlFor="ap-nome" className="sr-only">
        Seu nome
      </label>
      <input
        id="ap-nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome"
        autoComplete="name"
        className="ap-campo mb-3"
      />

      {pedindoAjuste ? (
        <div className="mb-3 flex flex-col gap-2">
          <label
            htmlFor="ap-comentario"
            className="text-[length:var(--text-small-size)] font-medium"
          >
            Quais ajustes são necessários?
          </label>
          <p className="ap-meta">
            Sobre: {demanda}
            {totalDeMateriais > 0
              ? ` · ${totalDeMateriais} ${totalDeMateriais === 1 ? "material" : "materiais"}`
              : ""}
          </p>
          <textarea
            id="ap-comentario"
            value={comentario}
            onChange={(e) => {
              setComentario(e.target.value);
              if (erro) setErro(null);
            }}
            rows={4}
            placeholder="Descreva o que precisa ser alterado…"
            className="ap-campo resize-y"
          />
        </div>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="mb-3 text-[length:var(--text-caption-size)]"
          style={{ color: "var(--ap-coral)" }}
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {pedindoAjuste ? (
          <>
            <button
              type="button"
              disabled={enviando}
              onClick={() => void enviar("ajuste")}
              className="ap-botao-principal"
            >
              <IconPencil size={17} stroke={2} aria-hidden />
              {enviando ? "Enviando…" : "Enviar pedido de ajustes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPedindoAjuste(false);
                setErro(null);
              }}
              className="ap-botao-fantasma w-full"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={enviando}
              onClick={() => setConfirmando(true)}
              className="ap-botao-principal"
            >
              <IconCheck size={18} stroke={2.5} aria-hidden />
              Aprovar esta versão
            </button>
            <button
              type="button"
              onClick={() => setPedindoAjuste(true)}
              className="ap-botao-fantasma flex w-full items-center justify-center gap-2"
            >
              <IconPencil size={16} stroke={1.75} aria-hidden />
              Pedir ajustes
            </button>
          </>
        )}
      </div>

      <p className="ap-meta mt-4 flex items-start gap-1.5">
        <IconShieldCheck
          size={14}
          stroke={1.75}
          aria-hidden
          className="mt-0.5 shrink-0"
        />
        O download será liberado após a aprovação desta versão.
      </p>

      <AlertDialog.Root open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <AlertDialog.Content
            className="ap-pagina fixed top-1/2 left-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border p-5"
            style={{
              background: "var(--ap-superficie)",
              borderColor: "var(--ap-linha-forte)",
              minHeight: 0,
            }}
          >
            <AlertDialog.Title className="text-[length:var(--text-h3-size)] font-semibold">
              Aprovar este material?
            </AlertDialog.Title>
            <AlertDialog.Description className="ap-texto mt-2">
              Você está aprovando{" "}
              <strong style={{ color: "var(--ap-tinta)" }}>{demanda}</strong>
              {totalDeMateriais > 1 ? (
                <>
                  {" "}
                  — os {totalDeMateriais} materiais desta demanda, e não apenas
                  o que está na tela
                </>
              ) : null}
              . Quem cuida dela será avisado, e sua resposta fica registrada no
              histórico.
            </AlertDialog.Description>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void enviar("aprovado")}
                  className="ap-botao-principal sm:w-auto sm:px-5"
                >
                  <IconCheck size={17} stroke={2.5} aria-hidden />
                  {enviando ? "Registrando…" : "Confirmar aprovação"}
                </button>
              </AlertDialog.Action>
              <AlertDialog.Cancel asChild>
                <button type="button" className="ap-botao-fantasma sm:w-auto">
                  Voltar
                </button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
