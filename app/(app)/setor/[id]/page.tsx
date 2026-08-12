import { SectorProjects } from "@/components/project/SectorProjects";
import { KanbanBoard } from "@/components/task/KanbanBoard";
import { QuickAdd } from "@/components/task/QuickAdd";
import { createClient } from "@/lib/supabase/server";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sector } = await supabase
    .from("sector")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <h2 className="text-[length:var(--text-h1-size)] font-semibold leading-[var(--text-h1-line)] text-fg">
        {sector?.name ?? "Setor"}
      </h2>
      <SectorProjects sectorId={id} />
      <div className="max-w-[var(--max-width-read)]">
        <QuickAdd defaultSectorId={id} />
      </div>
      <div className="min-h-0 flex-1">
        <KanbanBoard sectorId={id} />
      </div>
    </div>
  );
}
