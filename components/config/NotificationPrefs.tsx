"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import type { Prefs } from "@/lib/notifications/prefs";
import {
  useNotificationPrefs,
  useSaveNotificationPrefs,
} from "@/lib/queries/useNotificationPrefs";

type Linha = { chave: keyof Prefs; label: string; detalhe: string };

const EVENTOS: Linha[] = [
  {
    chave: "mencao",
    label: "Menções",
    detalhe: "Alguém escreveu @você num comentário ou no chat.",
  },
  {
    chave: "atribuicao",
    label: "Demanda atribuída a mim",
    detalhe: "Quando alguém coloca seu nome como responsável.",
  },
  {
    chave: "aprovacao",
    label: "Resposta do cliente",
    detalhe: "O cliente aprovou ou pediu ajuste pelo link público.",
  },
  {
    chave: "comentario",
    label: "Comentários nas minhas demandas",
    detalhe: "Alguém comentou em algo que é seu.",
  },
];

const ALERTAS: Linha[] = [
  {
    chave: "prazos",
    label: "Prazos",
    detalhe: "Demanda atrasada, vencendo hoje ou nos próximos dias.",
  },
  {
    chave: "contratos",
    label: "Contratos vencendo",
    detalhe: "Vigência chegando ao fim.",
  },
  {
    chave: "financeiro",
    label: "Parcelas vencendo",
    detalhe: "Recebimento ou pagamento com data próxima.",
  },
];

function Grupo({
  titulo,
  descricao,
  linhas,
  prefs,
  onToggle,
}: {
  titulo: string;
  descricao: string;
  linhas: Linha[];
  prefs: Prefs;
  onToggle: (chave: keyof Prefs, valor: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-fg text-[length:var(--text-small-size)] font-medium">
          {titulo}
        </h3>
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          {descricao}
        </p>
      </div>
      <ul className="border-line divide-line divide-y rounded-md border">
        {linhas.map((l) => (
          <li key={l.chave}>
            <label className="hover:bg-hover flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors [transition-duration:var(--dur-fast)]">
              <Checkbox
                checked={prefs[l.chave]}
                onCheckedChange={(c) => onToggle(l.chave, c === true)}
                aria-label={l.label}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="text-fg block text-[length:var(--text-small-size)]">
                  {l.label}
                </span>
                <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                  {l.detalhe}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * O que aparece no seu sino.
 *
 * A escolha é sua e vale nos dois workspaces — quem participa de duas
 * empresas não decide duas vezes que não liga para aviso de contrato.
 *
 * Desligar esconde, não apaga: religar traz o histórico de volta.
 */
export function NotificationPrefs() {
  const toast = useToast();
  const { data: prefs, isPending } = useNotificationPrefs();
  const salvar = useSaveNotificationPrefs();

  if (isPending || !prefs) {
    return <p className="text-fg-secondary">Carregando…</p>;
  }

  function alternar(chave: keyof Prefs, valor: boolean) {
    salvar.mutate(
      { [chave]: valor },
      {
        onError: () =>
          toast.show({ message: "Não foi possível salvar a preferência" }),
      }
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
          Notificações
        </h2>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Vale só para você. Desligar esconde do sino — o registro continua, e
          religar traz de volta.
        </p>
      </div>

      <Grupo
        titulo="Quando alguém faz algo"
        descricao="Ficam no sino até você marcar como lidas."
        linhas={EVENTOS}
        prefs={prefs}
        onToggle={alternar}
      />

      <Grupo
        titulo="Avisos de prazo"
        descricao="Somem sozinhos quando você resolve. Não há o que marcar como lido."
        linhas={ALERTAS}
        prefs={prefs}
        onToggle={alternar}
      />
    </section>
  );
}
