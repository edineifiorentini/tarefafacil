import { IconCheck, IconCircle, IconEyeOff } from "@tabler/icons-react";
import type { Metadata } from "next";

import { ApprovalBox } from "@/components/share/ApprovalBox";
import { readSharedTask } from "@/lib/share/publicTask";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Página pública de uma demanda. Quem abre não tem conta.
 *
 * `noindex`: link compartilhado não é conteúdo de site. Sem isto, um
 * buscador poderia indexar a demanda de um cliente.
 */
export const metadata: Metadata = {
  title: "Acompanhamento",
  robots: { index: false, follow: false },
};

const ESTADO = {
  aberta: { label: "Em andamento", tone: "var(--chart-1)" },
  concluida: { label: "Concluída", tone: "var(--status-done-fg)" },
  cancelada: { label: "Cancelada", tone: "var(--color-fg-muted)" },
} as const;

const MOTIVO = {
  inexistente: "Este link não existe.",
  revogado: "Este link foi revogado por quem compartilhou.",
  expirado: "Este link expirou.",
} as const;

function dataBR(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export default async function SharedTaskPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultado = await readSharedTask(token);

  if (!resultado.ok) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <IconEyeOff
          size={28}
          stroke={1.5}
          className="text-fg-muted"
          aria-hidden
        />
        <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
          Acompanhamento indisponível
        </h1>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {MOTIVO[resultado.reason]} Peça um link novo a quem enviou.
        </p>
      </main>
    );
  }

  // Só conta a visita depois de saber que o link é válido — e nunca em
  // link revogado ou expirado, senão o contador viraria medidor de
  // tentativa, não de leitura.
  await createAdminClient().rpc("register_share_view", { p_token: token });

  const { view } = resultado;
  const estado = ESTADO[view.state];
  const feitas = view.subtasks.filter((s) => s.done).length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        {view.orgName ? (
          <p className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            {view.orgName}
          </p>
        ) : null}
        <h1 className="text-fg text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold wrap-anywhere">
          {view.title}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap"
            style={{
              color: estado.tone,
              background: `color-mix(in srgb, ${estado.tone} 12%, transparent)`,
            }}
          >
            {estado.label}
          </span>
          {view.sectorName ? (
            <span className="bg-sunken text-fg-secondary rounded-full px-2.5 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap">
              {view.sectorName}
            </span>
          ) : null}
          {view.dueDate ? (
            <span className="text-fg-secondary text-[length:var(--text-caption-size)] whitespace-nowrap">
              Prazo: {dataBR(view.dueDate)}
            </span>
          ) : null}
        </div>
      </header>

      {view.description ? (
        <section className="border-line bg-card rounded-md border p-4 shadow-[var(--shadow-card)]">
          <p className="text-fg text-[length:var(--text-small-size)] whitespace-pre-wrap">
            {view.description}
          </p>
        </section>
      ) : null}

      {view.subtasks.length > 0 ? (
        <section className="border-line bg-card rounded-md border p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-fg-secondary mb-2 text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Etapas · {feitas} de {view.subtasks.length}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {view.subtasks.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[length:var(--text-small-size)]"
              >
                {s.done ? (
                  <IconCheck
                    size={16}
                    stroke={2}
                    aria-hidden
                    className="mt-0.5 shrink-0 text-[var(--status-done-fg)]"
                  />
                ) : (
                  <IconCircle
                    size={16}
                    stroke={1.5}
                    aria-hidden
                    className="text-fg-muted mt-0.5 shrink-0"
                  />
                )}
                <span className={s.done ? "text-done line-through" : "text-fg"}>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="text-fg-muted flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--text-caption-size)]">
        {view.assigneeName ? (
          <span>Responsável: {view.assigneeName}</span>
        ) : null}
        <span>Atualizado em {dataBR(view.updatedAt)}</span>
      </footer>

      {/* Demanda cancelada não tem o que aprovar. Concluída tem: é comum o
          cliente aprovar depois de a peça ficar pronta. */}
      {view.state !== "cancelada" ? (
        <ApprovalBox
          token={token}
          ultimaDecisao={view.lastDecision}
          ultimaEm={view.lastDecisionAt ? dataBR(view.lastDecisionAt) : null}
        />
      ) : null}
    </main>
  );
}
