"use client";

import { useState } from "react";

import { IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const KEY = ["cobranca-atual"] as const;

type Estado =
  | { estado: "sem_cobranca"; motivo: string }
  | { estado: "manual"; motivo: string }
  | {
      estado: "aberta";
      id: string;
      valorCents: number;
      copiaECola: string | null;
      qrCode: string | null;
      expiraEm: string | null;
      periodo: { inicio: string; fim: string };
    }
  | { estado: "paga"; pagaEm: string | null; acessoAte: string | null };

/**
 * O pagamento visto por quem paga.
 *
 * **O copia e cola vem antes do QR code na hierarquia da tela**, e não é
 * detalhe: no celular — que é onde quase todo Pix é pago — ninguém aponta a
 * câmera para a própria tela. O QR serve para quem está no computador com o
 * celular na mão, e por isso fica visível mas em segundo plano.
 *
 * A tela NÃO fica perguntando ao servidor se pagou. Pix cai em segundos,
 * mas quem acabou de pagar volta e recarrega; uma consulta a cada dois
 * segundos gastaria banco e provedor por uma pressa que a pessoa não tem. O
 * botão de conferir é explícito.
 */
export function PixCheckout() {
  const toast = useToast();
  const qc = useQueryClient();
  const [copiado, setCopiado] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Estado> => {
      const res = await fetch("/api/billing/cobranca");
      if (!res.ok) throw new Error("falha");
      return (await res.json()) as Estado;
    },
  });

  const gerar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/cobranca", { method: "POST" });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Só quem administra a empresa pode gerar a cobrança."
            : "Não foi possível gerar a cobrança."
        );
      }
      return (await res.json()) as Estado;
    },
    onSuccess: (novo) => {
      qc.setQueryData(KEY, novo);
      if (novo.estado === "manual" || novo.estado === "sem_cobranca") {
        toast.show({ message: novo.motivo });
      }
    },
    onError: (e: Error) => toast.show({ message: e.message }),
  });

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      // Volta sozinho: um "copiado" permanente deixa de informar.
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.show({ message: "Não foi possível copiar. Selecione e copie." });
    }
  }

  if (isPending) return <Skeleton variant="block" className="h-32" />;
  if (!data) return null;

  if (data.estado === "paga") {
    return (
      <div className="border-line bg-card flex items-start gap-3 rounded-md border p-4">
        <IconCheck size={18} stroke={2} aria-hidden className="text-fg-secondary mt-0.5 shrink-0" />
        <div>
          <p className="text-fg text-[length:var(--text-small-size)] font-medium">
            Pagamento em dia
          </p>
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {data.acessoAte
              ? `Seu acesso está garantido até ${dataBR(data.acessoAte)}.`
              : "Nada em aberto."}
          </p>
        </div>
      </div>
    );
  }

  if (data.estado === "aberta") {
    return (
      <div className="border-line bg-card flex flex-col gap-4 rounded-md border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            {reais(data.valorCents)}
          </p>
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {dataBR(data.periodo.inicio)} a {dataBR(data.periodo.fim)}
          </p>
        </div>

        {data.copiaECola ? (
          <div className="flex flex-col gap-2">
            <p className="text-fg text-[length:var(--text-small-size)] font-medium">
              Pix copia e cola
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={data.copiaECola}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Código Pix copia e cola"
                className="border-line bg-sunken text-fg-secondary min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              />
              <Button
                size="sm"
                leadingIcon={copiado ? IconCheck : IconCopy}
                onClick={() => void copiar(data.copiaECola as string)}
              >
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        ) : null}

        {data.qrCode ? (
          <details className="group">
            <summary className="text-fg-secondary hover:text-fg inline-flex cursor-pointer items-center gap-2 text-[length:var(--text-small-size)]">
              <IconQrcode size={16} stroke={1.75} aria-hidden />
              Ver QR code
            </summary>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URI
                vinda do provedor; o otimizador do Next não processa e forçá-lo
                faria a imagem passar pelo servidor sem ganho. */}
            <img
              src={data.qrCode}
              alt="QR code para pagamento por Pix"
              className="mt-3 h-48 w-48 rounded-md bg-white p-2"
            />
          </details>
        ) : null}

        {data.expiraEm ? (
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Este código vale até {dataBR(data.expiraEm)}. Depois disso, gere um
            novo — a conta continua a mesma.
          </p>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          isLoading={gerar.isPending}
          onClick={() => void qc.invalidateQueries({ queryKey: KEY })}
        >
          Já paguei, conferir
        </Button>
      </div>
    );
  }

  // sem_cobranca e manual: os dois só têm um motivo para mostrar.
  return (
    <div className="border-line bg-card flex flex-col gap-3 rounded-md border p-4">
      <p className="text-fg-secondary text-[length:var(--text-small-size)]">
        {data.motivo}
      </p>
      {data.estado === "sem_cobranca" ? (
        <Button
          size="sm"
          isLoading={gerar.isPending}
          onClick={() => gerar.mutate()}
        >
          Gerar cobrança do período
        </Button>
      ) : null}
    </div>
  );
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}
