"use client";

import { Suspense, use, useState } from "react";

import { TextInput } from "@/components/ui/TextInput";
import { loadTablerIcons } from "@/lib/tabler-icons";

function Grid({
  query,
  value,
  onChange,
}: {
  query: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const icons = use(loadTablerIcons());
  const q = query.trim().toLowerCase();
  const names = Object.keys(icons).filter(
    (k) => k.startsWith("Icon") && !k.endsWith("Filled")
  );
  const filtered = (
    q ? names.filter((n) => n.slice(4).toLowerCase().includes(q)) : names
  ).slice(0, 60);

  if (filtered.length === 0) {
    return (
      <p className="text-fg-muted py-2 text-[length:var(--text-small-size)]">
        Nenhum ícone encontrado
      </p>
    );
  }

  return (
    <div role="listbox" aria-label="Ícones" className="grid grid-cols-6 gap-1">
      {filtered.map((name) => {
        const Glyph = icons[name];
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={name.slice(4)}
            onClick={() => onChange(name)}
            className={`inline-flex aspect-square items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)] ${
              selected
                ? "bg-selected text-fg-link"
                : "text-fg-secondary hover:bg-hover hover:text-fg"
            }`}
          >
            <Glyph size={20} stroke={1.5} />
          </button>
        );
      })}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <TextInput
        size="sm"
        type="search"
        placeholder="Buscar ícone…"
        aria-label="Buscar ícone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="border-line max-h-56 overflow-auto rounded-sm border p-1">
        <Suspense
          fallback={
            <p className="text-fg-muted py-2 text-[length:var(--text-small-size)]">
              Carregando ícones…
            </p>
          }
        >
          <Grid query={query} value={value} onChange={onChange} />
        </Suspense>
      </div>
    </div>
  );
}
