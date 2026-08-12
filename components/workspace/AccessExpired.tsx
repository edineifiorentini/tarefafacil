import { IconClockExclamation } from "@tabler/icons-react";

// Tela quando o acesso do workspace venceu (venda por período).
export function AccessExpired({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--max-width-read)] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-fg-muted">
        <IconClockExclamation size={28} stroke={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
          Acesso expirado
        </h1>
        <p className="text-fg-secondary">
          O período de acesso de{" "}
          <strong className="text-fg">{workspaceName}</strong> chegou ao fim.
          Fale com o responsável para renovar.
        </p>
      </div>
    </div>
  );
}
