import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/gcal/context";
import { consentUrl, gcalConfigured } from "@/lib/gcal/oauth";

// Inicia o consentimento OAuth do Google Agenda. Guarda `state:workspaceId`
// num cookie httpOnly para validar no callback (CSRF).
export async function GET(request: Request) {
  if (!gcalConfigured()) {
    return NextResponse.redirect(new URL("/config?gcal=indisponivel", request.url));
  }

  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth", `${state}:${ctx.workspaceId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(consentUrl(state));
}
