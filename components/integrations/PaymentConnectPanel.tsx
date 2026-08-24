"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import type { Integration } from "@/lib/integrations/catalog";
import type { Environment, ProviderId } from "@/lib/payments/provider";
import type { GatewayStatus } from "@/lib/payments/store";
import {
  ConnectError,
  useConnectPayment,
  useDisconnectPayment,
} from "@/lib/queries/usePayments";

/** Onde a pessoa vai buscar a chave. Um link e o caminho, sem tutorial. */
const ONDE_PEGAR: Record<ProviderId, { url: string; caminho: string }> = {
  mercado_pago: {
    url: "https://www.mercadopago.com.br/developers/panel",
    caminho: "Suas integrações → sua aplicação → Credenciais → Access token",
  },
  asaas: {
    url: "https://www.asaas.com/customerApiAccessToken/index",
    caminho: "Configurações → Integrações → Chave de API",
  },
};

const AMBIENTES = [
  { value: "sandbox", label: "Sandbox — não cobra de verdade" },
  { value: "producao", label: "Produção — cobra de verdade" },
];

/**
 * Formulário de uma conta de recebimento.
 *
 * O campo da chave é `type="password"`: fica em tela cheia de gente e é a
 * credencial que movimenta o dinheiro do cliente. E quando já existe conta
 * conectada, o campo volta VAZIO — o token não sai do servidor nem mascarado,
 * então não há o que preencher. Trocar a chave é colar a nova.
 */
export function PaymentConnectPanel({
  integration,
  provider,
  atual,
  onVoltar,
}: {
  integration: Integration;
  provider: ProviderId;
  atual?: GatewayStatus;
  onVoltar: () => void;
}) {
  const [token, setToken] = useState("");
  const [ambiente, setAmbiente] = useState<Environment>(
    atual?.environment ?? "sandbox"
  );
  const [erro, setErro] = useState<string | null>(null);

  const conectar = useConnectPayment();
  const desconectar = useDisconnectPayment();
  const toast = useToast();
  const onde = ONDE_PEGAR[provider];

  async function salvar() {
    setErro(null);
    try {
      await conectar.mutateAsync({ provider, token, environment: ambiente });
      setToken("");
      toast.show({ message: `${integration.name} conectado` });
      onVoltar();
    } catch (e) {
      setErro(
        e instanceof ConnectError ? e.message : "Não foi possível salvar agora"
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onVoltar}
        className="text-fg-secondary hover:text-fg flex w-fit items-center gap-1 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <IconArrowLeft size={16} stroke={1.5} />
        Voltar para integrações
      </button>

      <div className="border-line bg-card flex max-w-xl flex-col gap-4 rounded-md border p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-fg font-medium">{integration.name}</h2>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            {integration.hint}
          </p>
        </div>

        {atual ? (
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Conectado{atual.label ? ` como ${atual.label}` : ""} em{" "}
            {atual.environment === "producao" ? "produção" : "sandbox"}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="token-gateway"
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            {atual ? "Nova chave" : "Chave de API"}
          </label>
          <TextInput
            id="token-gateway"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            error={!!erro}
            onChange={(e) => setToken(e.target.value)}
            // Segue o ambiente: em sandbox o Mercado Pago espera TEST-, e um
            // exemplo com o prefixo do outro ambiente é o começo do erro que
            // a checagem existe para pegar.
            placeholder={
              provider === "asaas"
                ? ambiente === "sandbox"
                  ? "$aact_hmlg_…"
                  : "$aact_prod_…"
                : ambiente === "sandbox"
                  ? "TEST-…"
                  : "APP_USR-…"
            }
          />
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Pegue em{" "}
            <a
              href={onde.url}
              target="_blank"
              rel="noreferrer"
              className="text-fg-link underline"
            >
              {integration.name}
            </a>
            : {onde.caminho}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="ambiente-gateway"
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            Ambiente
          </label>
          <Select
            id="ambiente-gateway"
            options={AMBIENTES}
            value={ambiente}
            onValueChange={(v) => setAmbiente(v as Environment)}
          />
        </div>

        {erro ? (
          <p
            role="alert"
            className="text-[length:var(--text-small-size)] text-[var(--status-overdue-fg)]"
          >
            {erro}
          </p>
        ) : null}

        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          A chave é cifrada antes de ir para o banco e nunca volta para o
          navegador. A conferência é feita com o provedor antes de salvar.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            isLoading={conectar.isPending}
            disabled={!token.trim()}
            onClick={salvar}
          >
            {atual ? "Salvar nova chave" : "Conectar"}
          </Button>

          {atual ? (
            <Button
              variant="secondary"
              size="sm"
              isLoading={desconectar.isPending}
              onClick={async () => {
                await desconectar.mutateAsync(provider);
                toast.show({ message: `${integration.name} desconectado` });
                onVoltar();
              }}
            >
              Desconectar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
