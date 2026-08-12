"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";

import { useTheme } from "@/lib/utils/useTheme";

/**
 * Alterna entre tema claro e escuro. Acessível: rótulo descritivo e aria-pressed.
 * Substituído/absorvido pelo IconButton (átomo) na E05.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-pressed={isDark}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
    >
      {isDark ? (
        <IconSun size={20} stroke={1.5} />
      ) : (
        <IconMoon size={20} stroke={1.5} />
      )}
    </button>
  );
}
