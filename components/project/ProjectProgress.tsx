import { ProgressBar } from "@/components/ui/ProgressBar";

export function ProjectProgress({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <ProgressBar
          value={pct}
          label={`${done} de ${total} tarefas concluídas`}
        />
      </div>
      <span className="tnum text-fg-secondary shrink-0 text-[length:var(--text-small-size)]">
        {done}/{total}
      </span>
    </div>
  );
}
