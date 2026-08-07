"use client";

import { Suspense, use } from "react";

import { loadTablerIcons } from "@/lib/tabler-icons";

function Resolved({
  name,
  size,
  className,
}: {
  name: string;
  size: number;
  className?: string;
}) {
  const icons = use(loadTablerIcons());
  const Glyph = icons[name] ?? icons.IconSquare;
  return <Glyph size={size} stroke={1.5} className={className} aria-hidden />;
}

// Renderiza um ícone Tabler pelo nome de export (ex.: "IconHome").
export function DynamicIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Suspense
      fallback={<span style={{ width: size, height: size }} aria-hidden />}
    >
      <Resolved name={name} size={size} className={className} />
    </Suspense>
  );
}
