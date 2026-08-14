import { IconClockExclamation, IconLock } from "@tabler/icons-react";

// Tela quando o workspace está bloqueado: por vencimento ou suspensão manual.
export function AccessExpired({
  workspaceName,
  reason = "expired",
}: {
  workspaceName: string;
  reason?: "expired" | "suspended";
}) {
  const suspended = reason === "suspended";
  const Icon = suspended ? IconLock : IconClockExclamation;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--max-width-read)] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-sunken text-fg-muted flex h-14 w-14 items-center justify-center rounded-full">
        <Icon size={28} stroke={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
          {suspended ? "Acesso bloqueado" : "Acesso expirado"}
        </h1>
        <p className="text-fg-secondary">
          {suspended ? (
            <>
              O acesso de <strong className="text-fg">{workspaceName}</strong>{" "}
              está temporariamente bloqueado. Fale com o responsável.
            </>
          ) : (
            <>
              O período de acesso de{" "}
              <strong className="text-fg">{workspaceName}</strong> chegou ao
              fim. Fale com o responsável para renovar.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
