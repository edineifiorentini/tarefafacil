// OAuth 2.0 do Google — fluxo próprio (offline) para obter e renovar tokens da
// Calendar API. Separado do login do Supabase. Só servidor.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const GCAL_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function clientId() {
  return process.env.GOOGLE_CLIENT_ID!;
}
function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET!;
}
function redirectUri() {
  return process.env.GOOGLE_REDIRECT_URI!;
}

export function consentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GCAL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // força refresh_token mesmo em reconexão
    // Sem include_granted_scopes: mantém o token restrito só aos escopos de
    // agenda (design 9.1 — escopo mínimo). Não herda drive/userinfo já
    // concedidos à conta noutros contextos.
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // segundos
  scope?: string;
  token_type: string;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Troca de código falhou (${res.status})`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    // 400 invalid_grant = refresh token revogado/expirado.
    throw new GcalAuthError(`Renovação de token falhou (${res.status})`);
  }
  return (await res.json()) as TokenResponse;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => {
    // Revogação best-effort: se falhar, ainda apagamos a conexão local.
  });
}

// Sinaliza que o refresh token não vale mais → UI mostra "reconecte".
export class GcalAuthError extends Error {}

export function gcalConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}
