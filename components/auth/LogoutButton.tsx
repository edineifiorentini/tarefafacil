"use client";

import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex items-center gap-2 rounded-sm border border-line bg-card px-3 py-2 text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:text-fg"
    >
      <IconLogout size={18} stroke={1.5} />
      Sair
    </button>
  );
}
