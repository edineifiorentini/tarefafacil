"use client";

import { Dialog } from "radix-ui";

import { useShell } from "./shell-context";

/**
 * O modal centralizado da casca.
 *
 * **Substituiu o painel de 400px para a tarefa** (9/set/2026). O drawer
 * lateral serve leitura curta; a tarefa é formulário longo, e espremida em
 * 400px virava rolagem infinita — sem contar as abas da tarefa existente,
 * que não cabem numa coluna estreita. O painel continua existindo para
 * cliente, contrato, projeto e funil, que são leituras curtas de verdade.
 *
 * O QUE VEM DO RADIX, e por isso não está escrito aqui: foco preso,
 * `aria-modal`, fechamento por Escape, retorno do foco ao elemento que
 * abriu, e o fundo inerte para o teclado. Reimplementar isso à mão é como
 * se perde acessibilidade sem perceber.
 *
 * O QUE ESTÁ AQUI:
 *
 * - **No celular ele ocupa a tela inteira.** Tentar manter uma caixa
 *   centralizada e estreita num aparelho de 375px dá um formulário dentro
 *   de uma janelinha, com rolagem dupla. `inset-0` no mobile, caixa a
 *   partir do `sm`.
 * - **`env(safe-area-inset-bottom)`** para o rodapé fixo não ficar embaixo
 *   da barra do iPhone.
 * - **O fundo continua visível.** Escurecimento leve e desfoque discreto:
 *   a página de origem — a lista com os filtros de quem estava lá — precisa
 *   continuar legível atrás, senão o modal parece uma navegação e não uma
 *   sobreposição.
 * - Altura no máximo 88vh, com a rolagem POR DENTRO: quem monta o conteúdo
 *   fixa cabeçalho e rodapé e deixa só o miolo rolar.
 *
 * A animação usa `tf-dialog-in`, que já existia — escala de 0.97 a 1 em
 * 200ms, sem salto. `prefers-reduced-motion` zera a duração no bloco global
 * do `globals.css`; não há um segundo bloco de acessibilidade escondido.
 */
export function CenterModal() {
  const { modal, closeModal } = useShell();
  const open = modal !== null;

  const largura =
    modal?.largura === "larga" ? "sm:max-w-[1120px]" : "sm:max-w-[960px]";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(proximo) => {
        if (!proximo) closeModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px] data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />

        <Dialog.Content
          aria-describedby={undefined}
          className={`bg-card fixed inset-0 z-[85] flex flex-col overflow-hidden [padding-bottom:env(safe-area-inset-bottom)] outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[88vh] sm:w-[calc(100vw-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-[var(--border)] sm:shadow-[var(--shadow-panel)] sm:data-[state=closed]:[animation:tf-dialog-out_var(--dur-fast)_ease-in] sm:data-[state=open]:[animation:tf-dialog-in_var(--dur-base)_var(--ease-out)] ${largura}`}
        >
          {/* O nome acessível. Fica invisível porque o conteúdo desenha o
              próprio cabeçalho — mas sem ele o leitor de tela abriria um
              diálogo sem nome, e o Radix avisa no console. */}
          <Dialog.Title className="sr-only">{modal?.titulo}</Dialog.Title>
          {modal?.node}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
