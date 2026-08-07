import { createClient } from "@/lib/supabase/server";

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-[var(--max-width-read)] px-6 py-8">
      <p className="text-fg-secondary">
        Logado como {user?.email}. A visão Hoje de verdade chega na E10.
      </p>
    </div>
  );
}
