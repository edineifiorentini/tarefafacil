"use client";

import { IconCheck, IconPencil } from "@tabler/icons-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Decisao = "aprovado" | "ajuste";

/**
 * A resposta do cliente, na página pública.
 *
 * Quem abre não tem conta e não vai criar uma para dizer "pode publicar".
 * A chamada vai para `record_task_approval`, que valida o token no banco —
 * esta tela não tem, e não pode ter, permissão de escrever em tabela
 * nenhuma.
 *
 * O nome é opcional de propósito: é cortesia para quem lê depois, não
 * identificação. Exigir nome de um visitante anônimo dá uma falsa sensação
 * de prova e atrapalha quem só quer aprovar.
 */
export function ApprovalBox({
  token,
  ultimaDecisao,
  ultimaEm,
}: {
  token: string;
  /** O que já foi respondido, se já houve resposta. */
  ultimaDecisao: Decisao | null;
  ultimaEm: string | null;
}) {
  const [escolha, setEscolha] = useState<Decisao | null>(null);
  const [comentario, setComentario] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<Decisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(decisao: Decisao) {
    if (enviando) return;
    // Pedir ajuste sem dizer o quê não ajuda ninguém.
    if (decisao === "ajuste" && !comentario.trim()) {
      setEscolha("ajuste");
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
    if (error || data === false) {
      setErro(
        "Não foi possível registrar. O link pode ter expirado — peça um novo a quem enviou."
      );
      return;
    }
    setPronto(decisao);
  }

  if (pronto) {
    return (
      <section
        role="status"
        className="border-line bg-card rounded-md border p-4 shadow-[var(--shadow-card)]"
      >
        <p className="text-fg text-[length:var(--text-small-size)] font-medium">
          {pronto === "aprovado"
            ? "Aprovação registrada. Obrigado!"
            : "Pedido de ajuste enviado."}
        </p>
        <p className="text-fg-secondary mt-1 text-[length:var(--text-caption-size)]">
          Quem cuida desta demanda já foi avisado.
        </p>
      </section>
    );
  }

  return (
    <section className="border-line bg-card flex flex-col gap-3 rounded-md border p-4 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="text-fg text-[length:var(--text-small-size)] font-medium">
          O que você achou?
        </h2>
        {ultimaDecisao ? (
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Você já respondeu{" "}
            {ultimaDecisao === "aprovado" ? "aprovando" : "pedindo ajuste"}
            {ultimaEm ? ` em ${ultimaEm}` : ""}. Pode responder de novo se algo
            mudou.
          </p>
        ) : (
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Sua resposta vai direto para quem está cuidando desta demanda.
          </p>
        )}
      </div>

      {escolha === "ajuste" ? (
        <textarea
          autoFocus
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="O que precisa mudar?"
          aria-label="O que precisa mudar"
          className="border-line bg-sunken text-fg placeholder:text-fg-muted rounded-sm border px-3 py-2 text-[length:var(--text-small-size)]"
        />
      ) : null}

      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={120}
        placeholder="Seu nome (opcional)"
        aria-label="Seu nome"
        className="border-line bg-sunken text-fg placeholder:text-fg-muted rounded-sm border px-3 py-2 text-[length:var(--text-small-size)]"
      />

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void enviar("aprovado")}
          disabled={enviando}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[var(--button-primary-bg)] px-4 py-2 text-[length:var(--text-small-size)] font-medium text-[var(--button-primary-fg)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-60"
        >
          <IconCheck size={16} stroke={2} aria-hidden />
          Aprovar
        </button>
        <button
          type="button"
          onClick={() =>
            escolha === "ajuste" ? void enviar("ajuste") : setEscolha("ajuste")
          }
          disabled={enviando}
          className="border-line bg-card text-fg hover:bg-hover inline-flex flex-1 items-center justify-center gap-2 rounded-sm border px-4 py-2 text-[length:var(--text-small-size)] font-medium transition-colors [transition-duration:var(--dur-fast)] disabled:opacity-60"
        >
          <IconPencil size={16} stroke={1.75} aria-hidden />
          {escolha === "ajuste" ? "Enviar pedido" : "Pedir ajuste"}
        </button>
      </div>
    </section>
  );
}
