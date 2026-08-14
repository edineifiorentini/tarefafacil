"use client";

import { IconPlayerPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { usePomodoro } from "@/lib/pomodoro/PomodoroContext";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroControl({
  taskId,
  taskTitle,
  pomodoroCount,
}: {
  taskId: string;
  taskTitle: string;
  pomodoroCount: number;
}) {
  const { active, remainingSeconds, start, pause, resume, stop } = usePomodoro();
  const mine = active?.taskId === taskId;
  const otherRunning = !!active && !mine;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[length:var(--text-small-size)] text-fg-secondary">
        🍅 {pomodoroCount} pomodoro{pomodoroCount === 1 ? "" : "s"} concluído
        {pomodoroCount === 1 ? "" : "s"}
      </p>

      {mine && active ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-selected px-2.5 py-1 text-[length:var(--text-small-size)] font-medium text-fg">
            {active.phase === "work" ? "Trabalho" : "Pausa"} · {formatClock(remainingSeconds)}
          </span>
          {active.paused ? (
            <Button variant="secondary" size="sm" leadingIcon={IconPlayerPlay} onClick={resume}>
              Retomar
            </Button>
          ) : (
            <Button variant="secondary" size="sm" leadingIcon={IconPlayerPause} onClick={pause}>
              Pausar
            </Button>
          )}
          <Button variant="ghost" size="sm" leadingIcon={IconPlayerStop} onClick={stop}>
            Parar
          </Button>
        </div>
      ) : otherRunning ? (
        <p className="text-[length:var(--text-caption-size)] text-fg-muted">
          Pomodoro em andamento em &ldquo;{active.taskTitle}&rdquo; — pare-o para iniciar aqui
        </p>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={IconPlayerPlay}
          onClick={() => start(taskId, taskTitle)}
        >
          Iniciar pomodoro
        </Button>
      )}
    </div>
  );
}
