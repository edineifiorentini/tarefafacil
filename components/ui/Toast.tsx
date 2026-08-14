"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ShowInput = Omit<Toast, "id"> & { duration?: number };

const ToastContext = createContext<{ show: (t: ShowInput) => void } | null>(
  null
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback((input: ShowInput) => {
    const id = Date.now() + Math.random();
    setToast({
      id,
      message: input.message,
      actionLabel: input.actionLabel,
      onAction: input.onAction,
    });
    const duration = input.duration ?? 5000;
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <div
          role="status"
          className="tf-glass-strong fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 [animation:tf-toast-in_var(--dur-base)_var(--ease-out)] items-center gap-4 rounded-md px-4 py-3"
        >
          <span className="text-fg text-[length:var(--text-small-size)]">
            {toast.message}
          </span>
          {toast.actionLabel ? (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="text-fg-link text-[length:var(--text-small-size)] font-medium"
            >
              {toast.actionLabel}
            </button>
          ) : null}
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
