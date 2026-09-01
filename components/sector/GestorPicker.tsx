"use client";

import { useState } from "react";

import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useDefinirGestor } from "@/lib/queries/useSectorGestor";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector } from "@/types/database";

/**
 * Quem responde pela equipe deste setor (0082).
 *
 * **Não exige papel de administrador**, e isso é deliberado: neste sistema
 * `admin` abre o módulo financeiro inteiro. Promover um líder de equipe a
 * admin para ele acompanhar prazos entregaria junto o caixa da empresa e o
 * valor/hora de cada colega. Um `member` comum pode ser gestor.
 *
 * Grava na hora, sem botão de salvar: é um campo só, e a confirmação é a
 * própria lista mudar.
 */
const SEM_GESTOR = "__nenhum__";

export function GestorPicker({ sector }: { sector: Sector }) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const definir = useDefinirGestor(workspace.id);

  const [escolhido, setEscolhido] = useState(
    sector.responsavel_id ?? SEM_GESTOR
  );

  const eu = members.find((m) => m.user_id === userId);
  const podeMexer = eu?.role === "owner" || eu?.role === "admin";
  if (!podeMexer) return null;

  function escolher(valor: string) {
    const anterior = escolhido;
    setEscolhido(valor);
    definir.mutate(
      { setorId: sector.id, pessoaId: valor === SEM_GESTOR ? null : valor },
      {
        onSuccess: () =>
          toast.show({
            message: valor === SEM_GESTOR ? "Gestor removido" : "Gestor definido",
          }),
        onError: () => {
          // Volta ao que era: a função do banco recusa quem não administra
          // e quem não é membro ativo, e a tela não deve fingir sucesso.
          setEscolhido(anterior);
          toast.show({ message: "Não foi possível definir o gestor" });
        },
      }
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
        Gestor da equipe
      </span>
      <Select
        options={[
          { value: SEM_GESTOR, label: "Sem gestor" },
          ...members
            .filter((m) => m.status === "active")
            .map((m) => ({
              value: m.user_id,
              label: m.display_name ?? m.email,
            })),
        ]}
        value={escolhido}
        onValueChange={escolher}
        aria-label="Gestor da equipe"
      />
      <span className="text-fg-secondary text-[length:var(--text-caption-size)]">
        Recebe o relatório de prazos deste setor. Não dá acesso a financeiro.
      </span>
    </label>
  );
}
