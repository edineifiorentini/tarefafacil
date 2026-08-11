// Store da conexão do Google (por workspace) + obtenção de access token válido.
// Só servidor: usa o client admin (secret key), pois `google_connection` não
// tem policy para `authenticated`.

import { createAdminClient } from "@/lib/supabase/admin";
import type { GcalStatus, GoogleConnection } from "@/types/database";

import { GcalAuthError, refreshAccessToken } from "./oauth";

// Renova quando falta menos disto para expirar (30s de folga).
const EXPIRY_SKEW_MS = 30_000;

export async function getConnection(
  workspaceId: string
): Promise<GoogleConnection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_connection")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveConnection(input: {
  workspaceId: string;
  userId: string;
  googleEmail: string | null;
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  scope: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const tokenExpiry = new Date(
    Date.now() + input.expiresInSec * 1000
  ).toISOString();
  const { error } = await admin.from("google_connection").upsert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    google_email: input.googleEmail,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    token_expiry: tokenExpiry,
    scope: input.scope,
    status: "active",
  });
  if (error) throw error;
}

export async function setStatus(
  workspaceId: string,
  status: GcalStatus
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("google_connection")
    .update({ status })
    .eq("workspace_id", workspaceId);
}

export async function deleteConnection(workspaceId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("google_connection")
    .delete()
    .eq("workspace_id", workspaceId);
}

// Retorna um access token válido, renovando com o refresh token se necessário.
// Marca a conexão como `expired` e lança GcalAuthError se o refresh falhar.
export async function getFreshAccessToken(
  workspaceId: string
): Promise<string> {
  const conn = await getConnection(workspaceId);
  if (!conn || conn.status === "revoked") {
    throw new GcalAuthError("Sem conexão com o Google Agenda");
  }

  const stillValid =
    conn.access_token &&
    conn.token_expiry &&
    new Date(conn.token_expiry).getTime() - EXPIRY_SKEW_MS > Date.now();
  if (stillValid && conn.status === "active") {
    return conn.access_token as string;
  }

  try {
    const t = await refreshAccessToken(conn.refresh_token);
    const admin = createAdminClient();
    await admin
      .from("google_connection")
      .update({
        access_token: t.access_token,
        token_expiry: new Date(Date.now() + t.expires_in * 1000).toISOString(),
        status: "active",
      })
      .eq("workspace_id", workspaceId);
    return t.access_token;
  } catch (e) {
    await setStatus(workspaceId, "expired");
    throw e instanceof GcalAuthError
      ? e
      : new GcalAuthError("Falha ao renovar o token");
  }
}
