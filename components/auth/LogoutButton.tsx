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
      className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)]"
    >
      <IconLogout size={20} stroke={1.5} />
      Sair
    </button>
  );
}
