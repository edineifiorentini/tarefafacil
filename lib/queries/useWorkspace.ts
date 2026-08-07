"use client";

import { createContext, createElement, useContext } from "react";
import type { ReactNode } from "react";

import type { Workspace } from "@/types/database";

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  return createElement(WorkspaceContext.Provider, { value: workspace }, children);
}

/** Workspace ativo. Lança se usado fora do WorkspaceProvider. */
export function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace deve ser usado dentro de WorkspaceProvider");
  }
  return ctx;
}
