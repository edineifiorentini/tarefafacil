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
    <div className="flex h-full flex-col gap-4 p-6">
      <h2 className="text-[length:var(--text-h2-size)] font-medium text-fg">
        {sector?.name ?? "Setor"}
      </h2>
      <div className="max-w-[var(--max-width-read)]">
        <QuickAdd defaultSectorId={id} />
      </div>
      <div className="min-h-0 flex-1">
        <KanbanBoard sectorId={id} />
      </div>
    </div>
  );
}
