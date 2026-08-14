"use client";

import { Tabs as RadixTabs } from "radix-ui";
import type { ReactNode } from "react";

// Abas para painéis longos (design: agrupar conteúdo extenso sem perder
// navegação por teclado — Radix já move o foco com as setas nos triggers).
export function Tabs({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <RadixTabs.Root defaultValue={defaultValue} className="flex flex-col gap-4">
      {children}
    </RadixTabs.Root>
  );
}

export function TabsList({ children }: { children: ReactNode }) {
  return (
    <RadixTabs.List className="flex items-center gap-4 border-b border-line">
      {children}
    </RadixTabs.List>
  );
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <RadixTabs.Trigger
      value={value}
      className="relative -mb-px border-b-2 border-transparent px-1 py-2 text-[length:var(--text-small-size)] text-fg-secondary outline-none transition-colors [transition-duration:var(--dur-fast)] hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] data-[state=active]:border-[var(--brand-600)] data-[state=active]:font-medium data-[state=active]:text-fg"
    >
      {children}
    </RadixTabs.Trigger>
  );
}

export function TabsContent({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <RadixTabs.Content
      value={value}
      className="flex flex-col gap-5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      {children}
    </RadixTabs.Content>
  );
}
