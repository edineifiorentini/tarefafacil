// Canal de notificação push (events.watch). Só funciona com uma URL HTTPS
// pública (o Google chama de fora). Em localhost não há URL pública, então o
// watch é ignorado e a sincronização de entrada roda por polling.

import { createAdminClient } from "@/lib/supabase/admin";

import { getFreshAccessToken } from "./tokens";

const CAL_WATCH =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch";
const CHANNELS_STOP = "https://www.googleapis.com/calendar/v3/channels/stop";

export function webhookUrl(): string | null {
  const u = process.env.GOOGLE_WEBHOOK_URL;
  if (!u || !u.startsWith("https://")) return null;
  return u;
}

export async function startWatch(workspaceId: string): Promise<void> {
  const address = webhookUrl();
  if (!address) return;

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(workspaceId);
  } catch {
    return;
  }

  const channelId = crypto.randomUUID();
  const res = await fetch(CAL_WATCH, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address,
      token: workspaceId,
    }),
  });
  if (!res.ok) return; // best-effort — o polling cobre a sincronização

  const data = (await res.json()) as {
    resourceId?: string;
    expiration?: string;
  };
  const admin = createAdminClient();
  await admin
    .from("google_connection")
    .update({
      channel_id: channelId,
      channel_resource_id: data.resourceId ?? null,
      channel_expiration: data.expiration
        ? new Date(Number(data.expiration)).toISOString()
        : null,
    })
    .eq("workspace_id", workspaceId);
}

export async function stopWatch(
  workspaceId: string,
  channelId: string | null,
  resourceId: string | null
): Promise<void> {
  if (!channelId || !resourceId) return;
  try {
    const accessToken = await getFreshAccessToken(workspaceId);
    await fetch(CHANNELS_STOP, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: channelId, resourceId }),
    });
  } catch {
    // best-effort
  }
}

export async function findWorkspaceByChannel(
  channelId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_connection")
    .select("workspace_id")
    .eq("channel_id", channelId)
    .maybeSingle();
  return data?.workspace_id ?? null;
}
