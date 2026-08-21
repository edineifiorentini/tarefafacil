"use client";

import {
  IconAlertTriangle,
  IconAt,
  IconBell,
  IconCalendarDue,
  IconCheck,
  IconClockExclamation,
  IconCoin,
  IconFileText,
  IconMessage,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { useMemo, useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  deriveContractAlerts,
  deriveFinanceAlerts,
  deriveTaskAlerts,
  mergeFeed,
  unreadCount,
} from "@/lib/notifications/derive";
import { DEFAULT_PREFS, filterFeed } from "@/lib/notifications/prefs";
import { toFeedEvent } from "@/lib/notifications/types";
import { useNotificationPrefs } from "@/lib/queries/useNotificationPrefs";
import type {
  AlertKind,
  FeedItem,
  FeedTarget,
} from "@/lib/notifications/types";
import { useContracts } from "@/lib/queries/useContracts";
import { useFinanceEntries } from "@/lib/queries/useFinance";
import {
  useApproveMember,
  useCurrentUserId,
  useMembers,
  useRemoveMember,
} from "@/lib/queries/useMembers";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/queries/useNotifications";
import { useAsOf } from "@/lib/queries/useAsOf";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { NotificationKind, Task } from "@/types/database";

/** Identidade estável: `?? []` criaria um array novo a cada render e
    invalidaria todos os useMemo que dependem de `tasks`. */
const SEM_TAREFAS: Task[] = [];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Membro",
  viewer: "Leitor",
  owner: "Dono",
};

const ALERT_ICON: Record<AlertKind, typeof IconBell> = {
  atrasada: IconAlertTriangle,
  prazo_hoje: IconClockExclamation,
  prazo_proximo: IconCalendarDue,
  contrato_vencendo: IconFileText,
  parcela_vencendo: IconCoin,
};

const ALERT_TONE: Record<AlertKind, string> = {
  atrasada: "var(--color-overdue)",
  prazo_hoje: "var(--tone-rose)",
  prazo_proximo: "var(--chart-1)",
  contrato_vencendo: "var(--tone-violet)",
  parcela_vencendo: "var(--tone-amber)",
};

const EVENT_ICON: Record<NotificationKind, typeof IconBell> = {
  mencao: IconAt,
  atribuicao: IconUserPlus,
  comentario: IconMessage,
};

/**
 * Sino. Três blocos, do mais acionável ao mais informativo:
 *
 *  1. Precisa de atenção — alertas derivados do estado atual (prazo, atraso,
 *     contrato, parcela). Não têm "marcar como lida": somem quando você
 *     resolve a causa.
 *  2. Para você — eventos gravados por trigger (menção, atribuição,
 *     comentário). Esses sim marcam como lidos.
 *  3. Pedidos de entrada — só para dono e admin.
 */
export function NotificationBell() {
  const workspace = useWorkspace();
  const router = useRouter();
  const toast = useToast();
  const { openPanel } = useShell();
  const [open, setOpen] = useState(false);

  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const tasksQuery = useTasks(workspace.id);
  const tasks = tasksQuery.data ?? SEM_TAREFAS;
  const { data: contracts = [] } = useContracts(workspace.id, canManage);
  const { data: financeEntries = [] } = useFinanceEntries(
    workspace.id,
    canManage
  );
  const { data: stored = [] } = useNotifications(workspace.id);

  const markRead = useMarkNotificationRead(workspace.id);
  const markAllRead = useMarkAllNotificationsRead(workspace.id);
  const approve = useApproveMember(workspace.id);
  const remove = useRemoveMember(workspace.id);

  // Mesmo motivo do painel: preso na montagem, "atrasada há 3 dias" não
  // sumia depois de entregar a demanda.
  const now = useAsOf(tasksQuery.dataUpdatedAt);

  // A preferência filtra a EXIBIÇÃO. O evento continua gravado: religar
  // um tipo traz o histórico de volta em vez de revelar um buraco.
  const { data: prefs } = useNotificationPrefs();

  const feed = useMemo(
    () =>
      filterFeed(
        mergeFeed(
          [
            ...deriveTaskAlerts(
              tasks,
              { myId: myId ?? null, alsoTeamOverdue: canManage },
              now
            ),
            ...deriveContractAlerts(contracts, now),
            ...deriveFinanceAlerts(financeEntries, now, canManage),
          ],
          stored.map(toFeedEvent)
        ),
        prefs ?? DEFAULT_PREFS
      ),
    [tasks, contracts, financeEntries, stored, myId, canManage, now, prefs]
  );

  const alerts = feed.filter((f) => f.nature === "alerta");
  const events = feed.filter((f) => f.nature === "evento");
  const pending = canManage
    ? members.filter((m) => m.status === "pending")
    : [];

  const count = unreadCount(feed) + pending.length;
  const temNaoLido = events.some((e) => e.nature === "evento" && !e.readAt);

  function go(target: FeedTarget) {
    setOpen(false);
    if (target.type === "task") {
      openPanel({
        title: "Tarefa",
        node: <TaskDetailPanel taskId={target.id} />,
      });
      return;
    }
    if (target.type === "chat") {
      router.push(`/chat?canal=${target.id}`);
      return;
    }
    router.push(target.type === "contract" ? "/contratos" : "/financeiro");
  }

  function openEvent(item: Extract<FeedItem, { nature: "evento" }>) {
    if (!item.readAt) markRead.mutate(item.id);
    go(item.target);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={
            count > 0
              ? `Notificações, ${count} ${count > 1 ? "pendentes" : "pendente"}`
              : "Notificações"
          }
          className="text-fg-secondary hover:bg-hover hover:text-fg relative inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)]"
        >
          <IconBell size={20} stroke={1.5} />
          {count > 0 ? (
            <span
              aria-hidden
              className="tnum absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-600)] px-1 text-[length:var(--text-caption-size)] font-medium text-[var(--button-primary-fg)]"
            >
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="tf-glass-strong z-50 flex max-h-[32rem] w-88 flex-col overflow-y-auto rounded-md p-3 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
        >
          {count === 0 ? (
            <p className="text-fg-secondary px-1 py-6 text-center text-[length:var(--text-small-size)]">
              Nada pendente. Bom trabalho.
            </p>
          ) : null}

          {alerts.length > 0 ? (
            <section className="flex flex-col gap-1">
              <SectionTitle>Precisa de atenção</SectionTitle>
              {alerts.map((item) =>
                item.nature === "alerta" ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.target)}
                    className="hover:bg-hover flex w-full items-start gap-2.5 rounded-sm px-1.5 py-2 text-left transition-colors [transition-duration:var(--dur-fast)]"
                  >
                    <Glyph
                      icon={ALERT_ICON[item.kind]}
                      tone={ALERT_TONE[item.kind]}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-fg block truncate text-[length:var(--text-small-size)] font-medium">
                        {item.title}
                      </span>
                      <span
                        className="block truncate text-[length:var(--text-caption-size)]"
                        style={{ color: ALERT_TONE[item.kind] }}
                      >
                        {item.detail}
                      </span>
                    </span>
                  </button>
                ) : null
              )}
            </section>
          ) : null}

          {events.length > 0 ? (
            <section className="mt-2 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <SectionTitle>Para você</SectionTitle>
                {temNaoLido ? (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    className="text-fg-link ml-auto shrink-0 pr-1 text-[length:var(--text-caption-size)] whitespace-nowrap hover:underline"
                  >
                    Marcar todas como lidas
                  </button>
                ) : null}
              </div>
              {events.map((item) =>
                item.nature === "evento" ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openEvent(item)}
                    className="hover:bg-hover flex w-full items-start gap-2.5 rounded-sm px-1.5 py-2 text-left transition-colors [transition-duration:var(--dur-fast)]"
                  >
                    <Glyph
                      icon={EVENT_ICON[item.kind]}
                      tone={
                        item.readAt
                          ? "var(--color-fg-muted)"
                          : "var(--brand-600)"
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[length:var(--text-small-size)] ${
                          item.readAt
                            ? "text-fg-secondary"
                            : "text-fg font-medium"
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.detail ? (
                        <span className="text-fg-muted block truncate text-[length:var(--text-caption-size)]">
                          {item.detail}
                        </span>
                      ) : null}
                    </span>
                    {!item.readAt ? (
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-600)]"
                      />
                    ) : null}
                  </button>
                ) : null
              )}
            </section>
          ) : null}

          {pending.length > 0 ? (
            <section className="mt-2 flex flex-col gap-1">
              <SectionTitle>Pedidos de entrada</SectionTitle>
              {pending.map((m) => {
                const name = m.display_name ?? m.email;
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-sm px-1.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-fg truncate text-[length:var(--text-small-size)] font-medium">
                        {name}
                      </p>
                      <p className="text-fg-muted truncate text-[length:var(--text-caption-size)]">
                        {m.email} · {ROLE_LABEL[m.role] ?? m.role}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      leadingIcon={IconCheck}
                      onClick={() =>
                        approve.mutate(m.user_id, {
                          onSuccess: () =>
                            toast.show({
                              message: `${name} entrou no workspace`,
                            }),
                          onError: () =>
                            toast.show({ message: "Não foi possível aceitar" }),
                        })
                      }
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Recusar ${name}`}
                      onClick={() =>
                        remove.mutate(m.user_id, {
                          onSuccess: () =>
                            toast.show({
                              message: `Pedido de ${name} recusado`,
                            }),
                          onError: () =>
                            toast.show({ message: "Não foi possível recusar" }),
                        })
                      }
                    >
                      <IconX size={16} stroke={1.5} />
                    </Button>
                  </div>
                );
              })}
            </section>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-fg-muted px-1 pt-1 pb-0.5 text-[length:var(--text-caption-size)] font-medium tracking-wide whitespace-nowrap uppercase">
      {children}
    </p>
  );
}

function Glyph({ icon: Icon, tone }: { icon: typeof IconBell; tone: string }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs"
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 12%, transparent)`,
      }}
    >
      <Icon size={14} stroke={1.75} />
    </span>
  );
}
