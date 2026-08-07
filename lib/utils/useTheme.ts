"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// Deve espelhar a chave usada no script anti-flash de app/layout.tsx.
const STORAGE_KEY = "tf-theme";

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return systemTheme();
}

// Fonte externa de verdade: o atributo data-theme do <html> (e o sistema).
// useSyncExternalStore evita setState-em-effect e mismatch de hidratação.
function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Lê e controla o tema. O valor renderiza a partir do data-theme já definido
 * pelo script anti-flash; alterá-lo reescreve o atributo e o observer notifica.
 */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    currentTheme,
    () => "light"
  );

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage indisponível (modo privado): mantém só na sessão.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
