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
    <div className="mx-auto max-w-[var(--max-width-read)] px-6 py-8">
      <h2 className="mb-2 text-[length:var(--text-h2-size)] font-medium text-fg">
        {sector?.name ?? "Setor"}
      </h2>
      <p className="text-fg-secondary">
        O quadro Kanban deste setor chega na E09.
      </p>
    </div>
  );
}
