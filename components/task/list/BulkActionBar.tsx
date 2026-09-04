"use client";

import { useState } from "react";

import {
  IconArrowRight,
  IconBan,
  IconCheck,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { AlertDialog, DropdownMenu } from "radix-ui";

import { Button } from "@/components/ui/Button";

/**
 * A barra que aparece quando há demandas selecionadas.
 *
 * Fica FIXA no rodapé, não grudada no topo. A versão antiga era `sticky
 * top-2` e cobria a barra de filtros justamente quando a pessoa queria
 * refinar a seleção — e num scroll longo ela ficava a uma tela de distância
 * das linhas marcadas.
 *
 * **Só as ações que existem.** `useBulkTaskActions` faz concluir, cancelar,
 * excluir e mover de setor. Prioridade, prazo e responsável em lote não
 * existem no hook, e criar botões que não fazem nada seria pior do que não
 * tê-los. Ficam registrados como melhoria, não como promessa na tela.
 *
 * Excluir pede confirmação: é a única irreversível.
 */
export function BulkActionBar({
  quantidade,
  setores,
  onConcluir,
  onCancelar,
  onMoverParaSetor,
  onExcluir,
  onLimpar,
}: {
  quantidade: number;
  setores: { value: string; label: string }[];
  onConcluir: () => void;
  onCancelar: () => void;
  onMoverParaSetor: (sectorId: string) => void;
  onExcluir: () => void;
  onLimpar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (quantidade === 0) return null;

  const rotulo = `${quantidade} ${quantidade === 1 ? "demanda selecionada" : "demandas selecionadas"}`;

  return (
    <>
      <div
        role="region"
        aria-label="Ações em lote"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      >
        <div className="tf-glass-strong border-line pointer-events-auto flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 shadow-[var(--shadow-popover)] [animation:tf-rise_var(--dur-base)_var(--ease-out)]">
          <span
            aria-live="polite"
            className="tnum text-fg px-1 text-[length:var(--text-small-size)] font-medium whitespace-nowrap"
          >
            {rotulo}
          </span>

          <Button
            variant="secondary"
            size="sm"
            leadingIcon={IconCheck}
            onClick={onConcluir}
          >
            Concluir
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leadingIcon={IconBan}
            onClick={onCancelar}
          >
            Cancelar demandas
          </Button>

          {setores.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={IconArrowRight}
                >
                  Mover para
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="center"
                  side="top"
                  sideOffset={6}
                  className="tf-glass-strong border-line z-50 max-h-64 min-w-52 overflow-y-auto rounded-md border p-1 shadow-[var(--shadow-popover)]"
                >
                  <DropdownMenu.Label className="text-fg-muted px-2 py-1.5 text-[length:var(--text-caption-size)]">
                    Mover para o setor
                  </DropdownMenu.Label>
                  {setores.map((s) => (
                    <DropdownMenu.Item
                      key={s.value}
                      onSelect={() => onMoverParaSetor(s.value)}
                      className="text-fg data-[highlighted]:bg-hover cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                    >
                      {s.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}

          <Button
            variant="danger"
            size="sm"
            leadingIcon={IconTrash}
            onClick={() => setConfirmando(true)}
          >
            Excluir
          </Button>

          <Button
            variant="ghost"
            size="sm"
            leadingIcon={IconX}
            onClick={onLimpar}
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      <AlertDialog.Root open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)]" />
          <AlertDialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md border p-5 text-left">
            <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
              Excluir {quantidade}{" "}
              {quantidade === 1 ? "demanda" : "demandas"}?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-fg-secondary mt-2 text-[length:var(--text-small-size)]">
              Isto não tem como desfazer. Se a intenção é tirar do fluxo sem
              perder o histórico, cancele em vez de excluir.
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="ghost" size="sm">
                  Voltar
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="danger" size="sm" onClick={onExcluir}>
                  Excluir
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
