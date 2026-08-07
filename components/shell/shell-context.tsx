"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type PanelContent = { title: string; node: ReactNode } | null;

type ShellContextValue = {
  panel: PanelContent;
  openPanel: (content: { title: string; node: ReactNode }) => void;
  closePanel: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

// Estado da casca: painel de detalhe (desliza) e navegação mobile.
export function ShellProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelContent>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openPanel = useCallback(
    (content: { title: string; node: ReactNode }) => setPanel(content),
    []
  );
  const closePanel = useCallback(() => setPanel(null), []);

  const value = useMemo<ShellContextValue>(
    () => ({ panel, openPanel, closePanel, mobileNavOpen, setMobileNavOpen }),
    [panel, openPanel, closePanel, mobileNavOpen]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell deve ser usado dentro de ShellProvider");
  return ctx;
}
