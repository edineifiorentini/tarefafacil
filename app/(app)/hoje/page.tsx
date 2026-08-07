import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: workspaces } = await supabase
    .from("workspace")
    .select("name")
    .limit(1);
  const ws = workspaces?.[0];

  return (
    <main className="mx-auto max-w-[var(--max-width-read)] px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[length:var(--text-h1-size)] font-medium leading-[var(--text-h1-line)] text-fg">
            Hoje
          </h1>
          <p className="text-fg-secondary">{ws?.name}</p>
        </div>
        <LogoutButton />
      </header>
      <p className="text-fg-secondary">
        Logado como {user?.email}. A visão Hoje de verdade chega na E10.
      </p>
    </main>
  );
}
