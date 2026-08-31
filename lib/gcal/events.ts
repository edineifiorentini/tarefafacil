// Mapeamento tarefa → evento (design 9.3) e chamadas à Google Calendar API.
// Só servidor. O access token válido vem de tokens.getFreshAccessToken.

import type { Sector, Task } from "@/types/database";

import { nearestColorId } from "./colors";
import { GcalAuthError } from "./oauth";

const CAL_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const DEFAULT_DURATION_MIN = 30;
/**
 * Chave que liga um evento do Google de volta à tarefa.
 *
 * **Mantém o nome antigo de propósito, e não é esquecimento do renome para
 * TAFLOW (31/ago/2026).** Esta string está gravada dentro de cada evento já
 * sincronizado, na agenda do Google do usuário — não no nosso banco.
 * Renomeá-la faria o `reconcile` deixar de reconhecer tudo o que já foi
 * sincronizado, e cada evento viraria órfão.
 *
 * Trocar exigiria ler as duas chaves durante uma transição e reescrever os
 * eventos existentes um a um. Custo real, em troca de nada que alguém veja:
 * esta string é invisível para quem usa.
 */
export const TASK_ID_PROP = "tarefafacil_task_id";

type GcalEventBody = {
  summary: string;
  description?: string;
  colorId?: string;
  extendedProperties: { private: Record<string, string> };
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: string };
    };
  };
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMinutesToLocal(dateTime: string, minutes: number): string {
  // dateTime: "YYYY-MM-DDTHH:MM:SS" (wall clock, sem offset)
  const d = new Date(`${dateTime}Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 19);
}

export function taskToEvent(
  task: Task,
  sector: Pick<Sector, "id" | "color">,
  opts: { appUrl: string; timeZone: string; createMeet?: boolean }
): GcalEventBody {
  if (!task.due_date) {
    throw new Error("Tarefa sem prazo não vira evento");
  }

  const link = `${opts.appUrl}/setor/${sector.id}`;
  const description = [task.description, `Abrir no TAFLOW: ${link}`]
    .filter(Boolean)
    .join("\n\n");

  const colorId = nearestColorId(sector.color) ?? undefined;
  const base: Omit<GcalEventBody, "start" | "end"> = {
    summary: task.title,
    description,
    colorId,
    extendedProperties: { private: { [TASK_ID_PROP]: task.id } },
    // Pede um Google Meet só na criação (patches seguintes mantêm o existente).
    ...(opts.createMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };

  if (!task.due_time) {
    // Dia inteiro: end.date é exclusivo → +1 dia.
    return {
      ...base,
      start: { date: task.due_date },
      end: { date: addDays(task.due_date, 1) },
    };
  }

  const startLocal = `${task.due_date}T${task.due_time.slice(0, 8)}`;
  // Fim explícito (reunião com intervalo) quando for depois do início; senão
  // a duração padrão de 30min.
  const hasValidEnd =
    !!task.due_end_time &&
    task.due_end_time.slice(0, 8) > task.due_time.slice(0, 8);
  const endLocal = hasValidEnd
    ? `${task.due_date}T${(task.due_end_time as string).slice(0, 8)}`
    : addMinutesToLocal(startLocal, DEFAULT_DURATION_MIN);
  return {
    ...base,
    start: { dateTime: startLocal, timeZone: opts.timeZone },
    end: { dateTime: endLocal, timeZone: opts.timeZone },
  };
}

async function callGcal(
  accessToken: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  const res = await fetch(`${CAL_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    throw new GcalAuthError("Token rejeitado pelo Google");
  }
  return res;
}

export type InsertResult = {
  eventId: string;
  etag: string;
  meetUrl: string | null;
};

type GcalEventResponse = {
  id: string;
  etag: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
};

function meetUrlOf(json: GcalEventResponse): string | null {
  if (json.hangoutLink) return json.hangoutLink;
  const video = json.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video"
  );
  return video?.uri ?? null;
}

// conferenceDataVersion=1 é obrigatório para criar/ler o Meet.
const CONF = "?conferenceDataVersion=1";

export async function insertEvent(
  accessToken: string,
  body: GcalEventBody
): Promise<InsertResult> {
  const res = await callGcal(accessToken, CONF, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`events.insert falhou (${res.status})`);
  const json = (await res.json()) as GcalEventResponse;
  return { eventId: json.id, etag: json.etag, meetUrl: meetUrlOf(json) };
}

export async function patchEvent(
  accessToken: string,
  eventId: string,
  body: GcalEventBody,
  etag: string | null
): Promise<InsertResult> {
  const res = await callGcal(
    accessToken,
    `/${encodeURIComponent(eventId)}${CONF}`,
    {
      method: "PATCH",
      // Detecção otimista de conflito (design 9.4). If-Match com o etag guardado.
      headers: etag ? { "if-match": etag } : {},
      body: JSON.stringify(body),
    }
  );
  // 404 = evento sumiu no Google; 412 = etag divergente (editado lá).
  if (res.status === 404) return insertEvent(accessToken, body);
  if (!res.ok) throw new Error(`events.patch falhou (${res.status})`);
  const json = (await res.json()) as GcalEventResponse;
  return { eventId: json.id, etag: json.etag, meetUrl: meetUrlOf(json) };
}

export async function deleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await callGcal(accessToken, `/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  // 404/410 = já não existe; tratamos como sucesso.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`events.delete falhou (${res.status})`);
  }
}
