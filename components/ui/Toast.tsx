"use client";

import { IconX } from "@tabler/icons-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type Toast = {
  id: number;
  message: string;
  /** Texto do atalho à direita. A superfície inteira dispara a mesma ação. */
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
};

type ShowInput = Omit<Toast, "id" | "duration"> & { duration?: number };

const ToastContext = createContext<{ show: (t: ShowInput) => void } | null>(
  null
);

/** Tempo padrão na tela. O suficiente para ler sem virar obstáculo. */
const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const agendar = useCallback(
    (id: number, duration: number) => {
      clearTimer();
      timer.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, duration);
    },
    [clearTimer]
  );

  const show = useCallback(
    (input: ShowInput) => {
      const id = Date.now() + Math.random();
      const duration = input.duration ?? DEFAULT_DURATION;
      setToast({
        id,
        message: input.message,
        actionLabel: input.actionLabel,
        onAction: input.onAction,
        duration,
      });
      agendar(id, duration);
    },
    [agendar]
  );

  const clicavel = !!toast?.onAction;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <div
          role="status"
          // Ler o aviso não pode ser uma corrida contra o relógio: com o
          // ponteiro ou o foco em cima, o tempo reinicia ao sair.
          onMouseEnter={clearTimer}
          onMouseLeave={() => agendar(toast.id, toast.duration)}
          onFocusCapture={clearTimer}
          onBlurCapture={() => agendar(toast.id, toast.duration)}
          // Superfície do botão primário, não vidro. Vidro é translúcido por
          // definição e some no fundo pérola — o oposto do que um aviso
          // precisa. Este token inverte entre os temas (grafite no claro,
          // quase-branco no escuro), então contrasta com a página nos dois.
          // Verde está fora: é reservado a dado financeiro positivo.
          className="fixed bottom-4 left-1/2 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 [animation:tf-toast-in_var(--dur-base)_var(--ease-out)] items-center gap-1 rounded-md bg-[var(--button-primary-bg)] p-1 shadow-[var(--shadow-card-hover)]"
        >
          {clicavel ? (
            // A superfície inteira é o alvo — quem quer ver a tarefa clica no
            // aviso, não caça o link. O X fica fora deste botão porque botão
            // dentro de botão é HTML inválido.
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                dismiss();
              }}
              className="flex min-w-0 flex-1 items-center gap-4 rounded-sm px-3 py-2 text-left transition-colors [transition-duration:var(--dur-fast)] hover:bg-[color-mix(in_srgb,var(--button-primary-fg)_12%,transparent)]"
            >
              <span className="min-w-0 flex-1 text-[length:var(--text-small-size)] text-[var(--button-primary-fg)]">
                {toast.message}
              </span>
              {toast.actionLabel ? (
                <span className="shrink-0 text-[length:var(--text-small-size)] font-semibold whitespace-nowrap text-[var(--button-primary-fg)] underline decoration-[color-mix(in_srgb,var(--button-primary-fg)_45%,transparent)] underline-offset-2">
                  {toast.actionLabel}
                </span>
              ) : null}
            </button>
          ) : (
            <span className="min-w-0 flex-1 px-3 py-2 text-[length:var(--text-small-size)] text-[var(--button-primary-fg)]">
              {toast.message}
            </span>
          )}

          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={dismiss}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[var(--button-primary-fg)] opacity-70 transition-opacity [transition-duration:var(--dur-fast)] hover:opacity-100"
          >
            <IconX size={15} stroke={1.75} />
          </button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
