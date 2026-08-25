import type { CSSProperties, ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { IconTile } from "@/components/ui/IconTile";
import type { Integration } from "@/lib/integrations/catalog";

/**
 * Cartão de uma integração.
 *
 * Card de dado é sólido (direção visual: legibilidade antes do efeito), e o
 * ícone é monocromático — a cor da marca de cada provedor viraria hexadecimal
 * solto no componente, que a regra 1 proíbe, e um mural de logos coloridos
 * briga com o pearl sóbrio do resto do sistema.
 *
 * Conectada é **azul da marca**, não verde: verde aqui é dado financeiro
 * positivo, e só. Um check verde ao lado de "Sicredi" leria como dinheiro
 * entrando, que é exatamente a confusão que não pode acontecer numa tela de
 * pagamentos.
 */
export function IntegrationCard({
  integration,
  connected = false,
  children,
}: {
  integration: Integration;
  connected?: boolean;
  /** Ações da própria integração. Só aparece em quem está disponível. */
  children?: ReactNode;
}) {
  const emBreve = integration.state === "em_breve";
  const tone = connected ? "var(--brand-600)" : "var(--text-muted)";

  return (
    <div
      // Conectada acende azul no hover; desconectada fica no cinza discreto.
      // É o mesmo tom do ícone — o halo confirma a cor que já está no cartão.
      style={{ "--card-tone": tone } as CSSProperties}
      className={`border-line bg-card flex flex-col gap-3 rounded-md border p-4 ${
        emBreve ? "opacity-60" : "tf-lift"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <IconTile icon={integration.icon} tone={tone} />
        {connected ? <Badge variant="brand">Conectada</Badge> : null}
        {emBreve ? <Badge>Em breve</Badge> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-fg font-medium">{integration.name}</span>
        <span className="text-fg-secondary text-[length:var(--text-small-size)]">
          {integration.hint}
        </span>
      </div>

      {emBreve ? null : children}
    </div>
  );
}
