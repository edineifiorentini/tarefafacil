"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

// Campo de busca com debounce e autofoco (atalho `/`). Sincroniza com a URL
// em tempo de render (sem setState em effect — regra do React Compiler).
export function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => cbRef.current(local), 250);
    return () => window.clearTimeout(t);
  }, [local]);

  return (
    <div className="relative">
      <IconSearch
        size={18}
        stroke={1.5}
        aria-hidden
        className="text-fg-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Buscar tarefas, descrições e insights"
        aria-label="Buscar"
        className="border-line bg-card text-fg placeholder:text-fg-muted focus-visible:border-line-strong h-10 w-full rounded-md border pr-9 pl-10"
      />
      {local ? (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            cbRef.current("");
            inputRef.current?.focus();
          }}
          aria-label="Limpar busca"
          className="text-fg-muted hover:text-fg absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1"
        >
          <IconX size={16} stroke={1.5} />
        </button>
      ) : null}
    </div>
  );
}
