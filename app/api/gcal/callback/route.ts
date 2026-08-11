import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/gcal/context";
import { exchangeCode } from "@/lib/gcal/oauth";
import { saveConnection } from "@/lib/gcal/tokens";

// A agenda "primary" tem como id o e-mail da conta — usamos para rotular.
async function fetchPrimaryEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const stored = cookieStore.get("gcal_oauth")?.value ?? null;
  cookieStore.delete("gcal_oauth");

  const home = new URL("/config", request.url);
  const fail = (reason: string) => {
    home.searchParams.set("gcal", reason);
    return NextResponse.redirect(home);
  };

  if (oauthError || !code || !state || !stored) return fail("erro");

  const [savedState, workspaceId] = stored.split(":");
  if (!savedState || savedState !== state) return fail("erro");

  const ctx = await requireUserAndWorkspace();
  if (!ctx || ctx.workspaceId !== workspaceId) return fail("erro");

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      // Sem refresh token (consentimento sem offline): pedir reconsentimento.
      return fail("sem_refresh");
    }
    const email = await fetchPrimaryEmail(tokens.access_token);
    await saveConnection({
      workspaceId,
      userId: ctx.userId,
      googleEmail: email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSec: tokens.expires_in,
      scope: tokens.scope ?? null,
    });
    return fail("ok"); // reutiliza o redirect com ?gcal=ok
  } catch {
    return fail("erro");
  }
}
