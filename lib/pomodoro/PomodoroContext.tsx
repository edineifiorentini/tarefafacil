"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { useToast } from "@/components/ui/Toast";
import { PomodoroWidget } from "@/components/pomodoro/PomodoroWidget";
import { playChime } from "@/lib/pomodoro/chime";
import { notifyPhaseComplete, requestNotifyPermission } from "@/lib/pomodoro/notify";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const LONG_BREAK_EVERY = 4;
const STORAGE_KEY = "tf-pomodoro";

type Phase = "work" | "break";

export type PomodoroSession = {
  taskId: string;
  taskTitle: string;
  phase: Phase;
  endsAt: number; // epoch ms
  paused: boolean;
  remainingMsAtPause: number | null;
  cycle: number; // pomodoros concluídos nesta sessão (define pausa longa)
};

// Helpers de módulo: todo Date.now() fica aqui, fora do corpo do Provider —
// o React Compiler proíbe relógio de parede no caminho de render, mas não
// enxerga chamadas indiretas através de uma função separada (mesmo padrão
// de HojeView.bucketFor e do formatDistanceToNow em GcalEditedBadge).
function freshSession(taskId: string, taskTitle: string, cycle: number): PomodoroSession {
  return {
    taskId,
    taskTitle,
    phase: "work",
    endsAt: Date.now() + WORK_MINUTES * 60_000,
    paused: false,
    remainingMsAtPause: null,
    cycle,
  };
}
function withPause(prev: PomodoroSession): PomodoroSession {
  return {
    ...prev,
    paused: true,
    remainingMsAtPause: Math.max(0, prev.endsAt - Date.now()),
  };
}
function withResume(prev: PomodoroSession): PomodoroSession {
  return {
    ...prev,
    paused: false,
    endsAt: Date.now() + (prev.remainingMsAtPause ?? 0),
    remainingMsAtPause: null,
  };
}
function nextAfterWork(prev: PomodoroSession): PomodoroSession {
  const cycle = prev.cycle + 1;
  const isLong = cycle % LONG_BREAK_EVERY === 0;
  const minutes = isLong ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES;
  return {
    ...prev,
    phase: "break",
    endsAt: Date.now() + minutes * 60_000,
    paused: false,
    remainingMsAtPause: null,
    cycle,
  };
}
function isDue(session: PomodoroSession): boolean {
  return !session.paused && Date.now() >= session.endsAt;
}
function remainingMsOf(session: PomodoroSession | null): number {
  if (!session) return 0;
  if (session.paused) return session.remainingMsAtPause ?? 0;
  return Math.max(0, session.endsAt - Date.now());
}

function loadPersisted(): PomodoroSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PomodoroSession) : null;
  } catch {
    return null;
  }
}
function savePersisted(s: PomodoroSession | null) {
  try {
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage indisponível (modo privado etc.) — segue sem persistir
  }
}

async function logPomodoroEntry(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("task_time_entry").insert({
    workspace_id: workspaceId,
    task_id: taskId,
    user_id: user.id,
    minutes: WORK_MINUTES,
    note: "Pomodoro",
    source: "pomodoro",
  });
}

type PomodoroContextValue = {
  active: PomodoroSession | null;
  remainingSeconds: number;
  start: (taskId: string, taskTitle: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

// Fica montado no layout do app (persiste entre navegações). Estado
// espelhado em localStorage: sobrevive a um F5 sem perder o pomodoro.
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const qc = useQueryClient();
  const toast = useToast();
  const [active, setActive] = useState<PomodoroSession | null>(null);
  const [tick, setTick] = useState(0);

  // Carrega do localStorage só no cliente pós-hidratação (evita mismatch
  // SSR: a 1ª renderização é sempre "sem pomodoro ativo" nos dois lados —
  // ler no initializer do useState quebraria a hidratação).
  useEffect(() => {
    const loaded = loadPersisted();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loaded) setActive(loaded);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // A cada segundo, verifica se a fase atual terminou. Passagem do tempo é
  // um sistema externo de verdade (não dá pra computar durante o render) —
  // a transição de fase acompanha efeitos colaterais reais (grava no banco,
  // toca som), não é só "estado que podia ter sido derivado".
  useEffect(() => {
    if (!active || !isDue(active)) return;

    if (active.phase === "work") {
      void logPomodoroEntry(workspace.id, active.taskId).then(() => {
        void qc.invalidateQueries({ queryKey: ["taskTime", active.taskId] });
      });
      playChime();
      toast.show({ message: `Pomodoro concluído em "${active.taskTitle}"` });
      notifyPhaseComplete(
        "Pomodoro concluído 🍅",
        `"${active.taskTitle}" — hora da pausa.`
      );
      const next = nextAfterWork(active);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(next);
      savePersisted(next);
    } else {
      playChime();
      toast.show({ message: "Pausa concluída — pronto para o próximo pomodoro" });
      notifyPhaseComplete(
        "Pausa concluída",
        `Pronto para o próximo pomodoro em "${active.taskTitle}".`
      );
      setActive(null);
      savePersisted(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, active, workspace.id]);

  const remainingSeconds = useMemo(() => {
    // `tick` não é lido no corpo — é dependência de propósito, para
    // recomputar a cada segundo (a contagem depende do relógio, não de tick).
    void tick;
    return Math.round(remainingMsOf(active) / 1000);
  }, [active, tick]);

  const start = useCallback((taskId: string, taskTitle: string) => {
    // Pedido de permissão precisa vir de um gesto do usuário (o clique em
    // "Iniciar pomodoro" é exatamente isso) — navegadores ignoram fora dele.
    void requestNotifyPermission();
    const next = freshSession(taskId, taskTitle, 0);
    setActive(next);
    savePersisted(next);
  }, []);

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.paused) return prev;
      const next = withPause(prev);
      savePersisted(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || !prev.paused) return prev;
      const next = withResume(prev);
      savePersisted(next);
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    setActive(null);
    savePersisted(null);
  }, []);

  const value = useMemo<PomodoroContextValue>(
    () => ({ active, remainingSeconds, start, pause, resume, stop }),
    [active, remainingSeconds, start, pause, resume, stop]
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
      <PomodoroWidget />
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro deve ser usado dentro de PomodoroProvider");
  return ctx;
}
