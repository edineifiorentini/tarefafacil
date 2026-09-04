import { IconCalendar, IconEyeOff } from "@tabler/icons-react";
import type { Metadata } from "next";

import { ApprovalDecisionCard } from "@/components/share/ApprovalDecisionCard";
import { ApprovalPageHeader } from "@/components/share/ApprovalPageHeader";
import {
  ApprovalStepsCard,
  ProjectOwnerCard,
  RequestBriefCard,
} from "@/components/share/ApprovalSidebar";
import { MediaArea } from "@/components/share/MediaArea";
import { readSharedTask } from "@/lib/share/publicTask";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A área pública de aprovação. Quem abre não tem conta.
 *
 * `noindex`: link compartilhado não é conteúdo de site. Sem isto, um
 * buscador poderia indexar a demanda de um cliente.
 *
 * **Ela é um Server Component, e a maior parte dela continua no servidor.**
 * Só a prévia (que tem zoom, troca de arquivo e tela cheia) e a caixa de
 * decisão rodam no navegador. Os três cards de contexto não têm estado nem
 * evento — mandá-los como JavaScript para alguém que abriu um link no
 * celular seria pagar por nada.
 *
 * O que NÃO chega ao navegador, e é o ponto da tela: nenhum endereço de
 * storage. `readSharedTask` monta a resposta campo a campo e o
 * `storage_key` não está entre eles; o arquivo só sai por
 * `/api/d/[token]/anexo/[id]`, que confere o token de novo e assina uma URL
 * de cinco minutos.
 */
export const metadata: Metadata = {
  title: "Área de aprovação",
  robots: { index: false, follow: false },
};

const MOTIVO = {
  inexistente: "Este link de aprovação não é válido.",
  revogado: "Este link foi revogado por quem compartilhou.",
  expirado: "Este link de aprovação expirou.",
} as const;

/**
 * O estado que o VISITANTE precisa ver — o da aprovação, não o interno.
 *
 * Uma demanda "em andamento" pode já ter sido aprovada, e uma "concluída"
 * pode nunca ter passado por aqui. Quem abre quer saber o que ele precisa
 * fazer.
 */
const ESTADO = {
  aguardando: { label: "Aguardando aprovação", cor: "var(--ap-lime)" },
  aprovado: { label: "Aprovada", cor: "var(--ap-lime)" },
  ajustes: { label: "Ajustes solicitados", cor: "#fcd34d" },
} as const;

function dataHoraBR(iso: string): string {
  const d = new Date(iso);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} às ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

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
      <main className="ap-pagina flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <IconEyeOff
          size={30}
          stroke={1.5}
          aria-hidden
          className="ap-icone-fraco"
        />
        <h1 className="text-[length:var(--text-h2-size)] font-semibold">
          Acompanhamento indisponível
        </h1>
        {/* Uma frase por motivo, e nenhuma delas confirma que uma demanda
            específica existe. */}
        <p className="ap-texto max-w-sm">
          {MOTIVO[resultado.reason]} Peça um link novo a quem enviou.
        </p>
      </main>
    );
  }

  // Só conta a visita depois de saber que o link é válido — e nunca em link
  // revogado ou expirado, senão o contador viraria medidor de tentativa.
  await createAdminClient().rpc("register_share_view", { p_token: token });

  const { view } = resultado;
  const estado = ESTADO[view.approvalState];
  const cancelada = view.state === "cancelada";

  return (
    <div className="ap-pagina">
      <ApprovalPageHeader
        orgName={view.orgName ?? "TAFLOW"}
        orgLogoUrl={view.orgLogoUrl}
      />

      <main className="ap-entra mx-auto flex w-full max-w-[77.5rem] flex-col gap-6 px-5 py-8 lg:px-8">
        <header className="flex flex-col gap-3">
          {/* Sem número de versão: o TAFLOW não versiona anexo. Escrever
              "VERSÃO 03" aqui seria um número inventado numa tela em que a
              pessoa assina embaixo. Está no roadmap. */}
          <p className="ap-eyebrow">Aprovação de material</p>

          <h1 className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold wrap-anywhere">
            {view.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-3 py-1 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap"
              style={{
                color: cancelada ? "var(--ap-tinta-3)" : estado.cor,
                borderColor: cancelada
                  ? "var(--ap-linha-forte)"
                  : `color-mix(in srgb, ${estado.cor} 40%, transparent)`,
              }}
            >
              {cancelada ? "Cancelada" : estado.label}
            </span>

            {view.sectorName ? (
              <span
                className="ap-texto rounded-full border px-3 py-1 text-[length:var(--text-caption-size)] whitespace-nowrap"
                style={{ borderColor: "var(--ap-linha)" }}
              >
                {view.sectorName}
              </span>
            ) : null}
          </div>

          <p className="ap-meta flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <IconCalendar size={14} stroke={1.75} aria-hidden />
              Atualizado em {dataHoraBR(view.updatedAt)}
            </span>
            {view.dueDate ? <span>Prazo: {dataBR(view.dueDate)}</span> : null}
          </p>
        </header>

        {/* Duas colunas no desktop: a peça manda, o contexto acompanha. No
            celular tudo empilha, e a prévia vem antes da decisão — ninguém
            aprova o que não viu. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <MediaArea
            token={token}
            arquivos={view.entregaveis}
            aprovado={view.approvalState === "aprovado"}
          />

          <aside className="flex flex-col gap-4">
            {view.assigneeName ? (
              <ProjectOwnerCard
                nome={view.assigneeName}
                avatarUrl={view.assigneeAvatarUrl}
              />
            ) : null}

            <RequestBriefCard
              descricao={view.description}
              entregaveis={view.entregaveis.map((e) => e.filename)}
            />

            <ApprovalStepsCard etapas={view.subtasks} />

            {/* Demanda cancelada não tem o que aprovar. Concluída tem: é
                comum o cliente aprovar depois de a peça ficar pronta. */}
            {cancelada ? (
              <section className="ap-card p-5">
                <p className="ap-texto">
                  Esta demanda foi cancelada e não está mais em aprovação.
                </p>
              </section>
            ) : (
              <ApprovalDecisionCard
                token={token}
                demanda={view.title}
                totalDeMateriais={view.entregaveis.length}
                ultimaDecisao={view.lastDecision}
                ultimaEm={
                  view.lastDecisionAt ? dataBR(view.lastDecisionAt) : null
                }
              />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
