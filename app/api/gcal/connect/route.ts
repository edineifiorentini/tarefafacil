import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  papelAlcanca,
  papelNoWorkspace,
  requireUserAndWorkspace,
} from "@/lib/auth/context";
import { consentUrl, gcalConfigured } from "@/lib/gcal/oauth";

// Inicia o consentimento OAuth do Google Agenda. Guarda `state:workspaceId`
// num cookie httpOnly para validar no callback (CSRF).
export async function GET(request: Request) {
  if (!gcalConfigured()) {
    return NextResponse.redirect(
      new URL("/config?gcal=indisponivel", request.url)
    );
  }

  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // `google_connection` é chaveada por EMPRESA (0007): uma conta por
  // workspace, não por pessoa. Conectar não é preferência individual — é
  // trocar a conta do Google da empresa inteira, e a nova sobrescreve a
  // anterior. Sem esta trava, um `viewer` (que não escreve nada no resto do
  // app) podia desviar a agenda de todo mundo para a conta dele.
  if (!papelAlcanca(await papelNoWorkspace(ctx), "admin")) {
    return NextResponse.redirect(
      new URL("/config?gcal=sem_permissao", request.url)
    );
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
