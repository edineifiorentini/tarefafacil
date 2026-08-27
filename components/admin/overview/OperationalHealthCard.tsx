import Link from "next/link";

import {
  IconChevronRight,
  IconCircleCheck,
  IconHeartbeat,
} from "@tabler/icons-react";

import { IconTile } from "@/components/ui/IconTile";
import type { Alerta, TomDeAlerta } from "@/lib/admin/health";

/**
 * Saúde da operação (especificação 8.6): o que exige decisão hoje.
 *
 * Cada linha é um link para a listagem já filtrada — alerta que não leva a
 * lugar nenhum é enfeite. Alertas zerados não aparecem: o cartão mostra o que
 * pede ação, e a ausência de problema tem seu próprio estado.
 */

const TONS: Record<TomDeAlerta, string> = {
  critico: "var(--negative)",
  atencao: "var(--status-due-soon-fg)",
  neutro: "var(--chart-2)",
};

export function OperationalHealthCard({ alertas }: { alertas: Alerta[] }) {
  return (
    <section
      aria-labelledby="saude-operacao"
      className="border-line bg-card flex flex-col rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)]"
    >
      <h2
        id="saude-operacao"
        className="text-fg mb-4 text-[length:var(--text-h3-size)] font-semibold"
      >
        Saúde da operação
      </h2>

      {alertas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <IconCircleCheck
            size={28}
            stroke={1.5}
            className="text-[var(--positive)]"
            aria-hidden
          />
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Nada exige ação agora
          </p>
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Testes, pagamentos, assentos e convites estão em dia.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {alertas.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href}
                className="hover:bg-hover group flex items-center gap-3 rounded-sm px-2 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                <IconTile icon={IconHeartbeat} tone={TONS[a.tom]} />
                <span className="text-fg flex-1 truncate text-[length:var(--text-small-size)]">
                  {a.label}
                </span>
                <span className="tnum text-fg font-semibold">
                  {a.quantidade}
                </span>
                <IconChevronRight
                  size={16}
                  stroke={1.75}
                  className="text-fg-muted shrink-0"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
