import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { gcalConfigured } from "@/lib/gcal/oauth";
import { getConnection } from "@/lib/gcal/tokens";
import type { GcalStatusResponse } from "@/lib/gcal/types";

export async function GET() {
  const configured = gcalConfigured();
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json<GcalStatusResponse>({
      configured,
      connected: false,
      email: null,
      status: null,
    });
  }

  const conn = await getConnection(ctx.workspaceId);
  return NextResponse.json<GcalStatusResponse>({
    configured,
    connected: !!conn && conn.status !== "revoked",
    email: conn?.google_email ?? null,
    status: conn?.status ?? null,
  });
}
