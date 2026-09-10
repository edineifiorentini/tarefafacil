"use client";

import type { ReactNode } from "react";

import { ApprovalMaterials } from "./ApprovalMaterials";
import { ApprovalHistory } from "./ApprovalHistory";
import { SharePanel } from "./SharePanel";

/**
 * Tudo que o CLIENTE vê, num lugar só.
 *
 * Antes isto estava espalhado dentro de "Trabalho": os anexos marcados como
 * entregáveis no meio dos internos, o link público entre as subtarefas, e a
 * resposta do cliente no fim de uma lista longa. Quem produz não tinha como
 * responder "o que o cliente está vendo agora?" sem percorrer a aba
 * inteira.
 *
 * **A separação entre interno e enviado é regra, não arrumação** (0083). O
 * bucket de anexos é privado de propósito, e publicar é ato explícito por
 * arquivo: briefing, contrato e planilha de custo não podem ir junto com a
 * arte. Duas listas em duas abas tornam a distinção visível, em vez de
 * depender de alguém reparar num ícone.
 */
export function TaskApprovalTab({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Secao
        titulo="Materiais para aprovação"
        apoio="Enviar deixa a peça em rascunho. O cliente só vê depois de publicada."
      >
        <ApprovalMaterials workspaceId={workspaceId} taskId={taskId} />
      </Secao>

      <Secao
        titulo="Acompanhamento externo"
        apoio="O cliente verá somente os materiais publicados para aprovação."
      >
        <SharePanel workspaceId={workspaceId} taskId={taskId} />
      </Secao>

      <Secao titulo="Resposta do cliente">
        <ApprovalHistory taskId={taskId} />
      </Secao>
    </div>
  );
}

function Secao({
  titulo,
  apoio,
  children,
}: {
  titulo: string;
  apoio?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-fg text-[length:var(--text-small-size)] font-medium">
          {titulo}
        </h3>
        {apoio ? (
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {apoio}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
