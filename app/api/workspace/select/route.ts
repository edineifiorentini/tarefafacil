import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Define o workspace ativo (cookie). Valida que o usuário é membro.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let workspaceId: string | undefined;
  try {
    const body = (await request.json()) as { workspaceId?: string };
    workspaceId = body.workspaceId;
  } catch {
    workspaceId = undefined;
  }
  if (!workspaceId) {
    return NextResponse.json({ error: "missing_workspace" }, { status: 400 });
  }

  // RLS: só retorna se o usuário for membro.
  const { data: ws } = await supabase
    .from("workspace")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_workspace", workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
