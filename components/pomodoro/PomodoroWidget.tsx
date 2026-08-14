"use client";

import { IconPlayerPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

import { usePomodoro } from "@/lib/pomodoro/PomodoroContext";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Mini-timer flutuante — visível em qualquer tela do app enquanto houver um
// pomodoro ativo, mesmo depois de sair do painel da demanda.
export function PomodoroWidget() {
  const { active, remainingSeconds, pause, resume, stop } = usePomodoro();
  if (!active) return null;

  return (
    <div
      role="status"
      aria-label={`Pomodoro: ${active.phase === "work" ? "trabalho" : "pausa"}, ${formatClock(remainingSeconds)} restantes, tarefa ${active.taskTitle}`}
      className="fixed bottom-4 right-4 z-30 flex items-center gap-3 rounded-full border border-line bg-card px-4 py-2 shadow-[var(--shadow-panel)]"
    >
      <span aria-hidden className="text-[length:var(--text-h3-size)] leading-none">
        🍅
      </span>
      <div className="flex flex-col leading-tight">
        <span className="max-w-40 truncate text-[length:var(--text-caption-size)] text-fg-muted">
          {active.taskTitle}
        </span>
        <span className="tnum text-[length:var(--text-small-size)] font-semibold text-fg">
          {active.phase === "work" ? "Trabalho" : "Pausa"} · {formatClock(remainingSeconds)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {active.paused ? (
          <button
            type="button"
            aria-label="Retomar pomodoro"
            onClick={resume}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
          >
            <IconPlayerPlay size={16} stroke={1.5} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Pausar pomodoro"
            onClick={pause}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
          >
            <IconPlayerPause size={16} stroke={1.5} />
          </button>
        )}
        <button
          type="button"
          aria-label="Parar pomodoro"
          onClick={stop}
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
        >
          <IconPlayerStop size={16} stroke={1.5} />
        </button>
      </div>
    </div>
  );
}
