"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconArrowsMaximize,
  IconBan,
  IconDots,
  IconRotate,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

/**
 * As ações que mudam ou apagam a demanda, fora do caminho.
 *
 * **Saíram do rodapé fixo, e a mudança é de risco, não de estética.**
 * "Excluir tarefa" morava a um clique de distância, do lado de "Cancelar
 * demanda", visível o tempo todo enquanto alguém editava campos. Botão
 * destrutivo permanente na linha de trabalho é convite a um clique errado
 * que não tem desfazer.
 *
 * Cancelar e excluir continuam separados de propósito: cancelar é
 * reversível — o mesmo item vira "Reabrir demanda" —, e excluir leva junto
 * subtarefas, comentários, tempo registrado e anexos. Fundir os dois num
 * "arquivar" esconderia essa diferença.
 *
 * A exclusão ainda passa pela confirmação que já existia, com o título da
 * demanda escrito, para quem clicar conferir que é a certa.
 */
export function TaskActions({
  taskId,
  titulo,
  cancelada,
  onAlternarCancelamento,
  onExcluir,
}: {
  taskId: string;
  titulo: string;
  cancelada: boolean;
  onAlternarCancelamento: () => void;
  onExcluir: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const caminho = usePathname();
  // Já estamos na página cheia? Oferecer "abrir em página cheia" de dentro
  // dela seria um link que não leva a lugar nenhum.
  const naPaginaCheia = caminho?.startsWith("/tarefa/") ?? false;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label="Ações da demanda"
          // 44px: o mesmo alvo do botão de fechar ao lado.
          className="text-fg-secondary hover:text-fg hover:bg-sunken inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <IconDots size={20} stroke={1.5} aria-hidden />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            // Acima do modal: o menu nasce dentro dele e precisa passar por
            // cima, senão abre atrás e parece que o botão não fez nada.
            className="border-line bg-card z-[95] min-w-[220px] rounded-md border p-1 shadow-[var(--shadow-panel)] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
          >
            {/* O modal é bom para consulta rápida e criação. Quem passa a
                tarde dentro de uma demanda merece a tela inteira — e é a
                MESMA tela, montada com os mesmos componentes. */}
            {naPaginaCheia ? null : (
              <>
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/tarefa/${taskId}`}
                    className="text-fg hover:bg-hover data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconArrowsMaximize size={16} stroke={1.5} aria-hidden />
                    Abrir em página completa
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="bg-line my-1 h-px" />
              </>
            )}

            <DropdownMenu.Item
              onSelect={onAlternarCancelamento}
              className="text-fg hover:bg-hover data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-[length:var(--text-small-size)] outline-none"
            >
              {cancelada ? (
                <IconRotate size={16} stroke={1.5} aria-hidden />
              ) : (
                <IconBan size={16} stroke={1.5} aria-hidden />
              )}
              {cancelada ? "Reabrir demanda" : "Cancelar demanda"}
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="bg-line my-1 h-px" />

            <DropdownMenu.Item
              onSelect={() => setConfirmando(true)}
              className="text-overdue hover:bg-hover data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-[length:var(--text-small-size)] outline-none"
            >
              <IconTrash size={16} stroke={1.5} aria-hidden />
              Excluir permanentemente
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDeleteDialog
        open={confirmando}
        title={titulo}
        onOpenChange={setConfirmando}
        onConfirm={onExcluir}
      />
    </>
  );
}
