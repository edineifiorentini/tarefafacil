"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  LIMITES,
  descreverCarencia,
  descreverTeste,
  validarPolitica,
} from "@/lib/admin/politica";

const KEY = ["admin-settings"] as const;

type Settings = {
  signups_enabled: boolean;
  trial_days: number;
  initial_seats: number;
  audit_keep_days: number;
  grace_days: number;
};

const CAMPO_CLASSES =
  "border-line bg-card text-fg w-28 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

/**
 * Os números da política da plataforma (0088, 0089).
 *
 * Eram literais no código — `interval '7 days'` na trigger de cadastro, o
 * `default 5` dos assentos, o `GRACE_DAYS = 5` da cobrança —, e mudá-los
 * exigia migration.
 *
 * **Cada campo aqui diz o que de fato acontece, inclusive quando a resposta
 * é decepcionante.** A duração do teste não corta acesso, e o texto abaixo
 * do campo fala isso: a 0060 decidiu que o corte mora em
 * `access_expires_at`, e um painel que sugerisse o contrário faria quem
 * administra acreditar num bloqueio que não existe.
 */
export function PoliticaDeCadastro() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Settings> => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("forbidden");
      return (await res.json()) as Settings;
    },
  });

  const [rascunho, setRascunho] = useState<Settings | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Ajuste em render, e não em efeito: o React Compiler recusa setState
  // dentro de efeito neste projeto, e o objetivo aqui é só semear o
  // rascunho quando a resposta chega.
  const [ultimo, setUltimo] = useState<Settings | null>(null);
  if (data && data !== ultimo) {
    setUltimo(data);
    setRascunho(data);
    setErro(null);
  }

  const salvar = useMutation({
    mutationFn: async (v: Settings) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        // Só os campos deste cartão. O interruptor de cadastros é do
        // cartão de cima, e mandá-lo aqui gravaria por cima do que ele
        // acabou de mudar.
        body: JSON.stringify({
          trial_days: v.trial_days,
          initial_seats: v.initial_seats,
          audit_keep_days: v.audit_keep_days,
          grace_days: v.grace_days,
        }),
      });
      if (!res.ok) {
        const corpo = (await res.json().catch(() => null)) as {
          mensagem?: string;
        } | null;
        throw new Error(corpo?.mensagem ?? "Não foi possível salvar.");
      }
    },
    onSuccess: () => {
      toast.show({ message: "Política atualizada" });
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: Error) => setErro(e.message),
  });

  if (!data || !rascunho) return null;

  const mudou =
    rascunho.trial_days !== data.trial_days ||
    rascunho.initial_seats !== data.initial_seats ||
    rascunho.audit_keep_days !== data.audit_keep_days ||
    rascunho.grace_days !== data.grace_days;

  function alterar(campo: keyof Settings, bruto: string) {
    setErro(null);
    // Campo vazio vira NaN, e NaN passaria pela validação como número.
    const n = bruto === "" ? Number.NaN : Number(bruto);
    setRascunho((r) => (r ? { ...r, [campo]: n } : r));
  }

  function enviar() {
    if (!rascunho) return;
    const veredito = validarPolitica({
      cadastrosAbertos: rascunho.signups_enabled,
      diasDeTeste: rascunho.trial_days,
      assentosIniciais: rascunho.initial_seats,
      diasDeAuditoria: rascunho.audit_keep_days,
      diasDeCarencia: rascunho.grace_days,
    });
    // Valida antes de sair da tela: a mesma função que a rota usa, para o
    // erro chegar sem ida ao servidor e com o mesmo texto.
    if (!veredito.ok) {
      setErro(veredito.erro);
      return;
    }
    salvar.mutate(rascunho);
  }

  return (
    <section className="border-line bg-card flex flex-col gap-5 rounded-md border p-4">
      <Campo
        id="pol-teste"
        rotulo="Dias de teste"
        valor={rascunho.trial_days}
        limites={LIMITES.diasDeTeste}
        onChange={(v) => alterar("trial_days", v)}
        ajuda={descreverTeste(rascunho.trial_days)}
      />

      <Campo
        id="pol-assentos"
        rotulo="Assentos iniciais"
        valor={rascunho.initial_seats}
        limites={LIMITES.assentosIniciais}
        onChange={(v) => alterar("initial_seats", v)}
        ajuda="Quantas pessoas cabem numa empresa nova. O convite respeita este limite — vale só para quem se cadastrar daqui em diante."
      />

      <Campo
        id="pol-auditoria"
        rotulo="Retenção da auditoria"
        sufixo="dias"
        valor={rascunho.audit_keep_days}
        limites={LIMITES.diasDeAuditoria}
        onChange={(v) => alterar("audit_keep_days", v)}
        ajuda="Por quanto tempo o registro de quem mudou o quê é guardado. A varredura semanal apaga o que passou do prazo, e o que sai não volta."
      />

      <Campo
        id="pol-carencia"
        rotulo="Tolerância de pagamento"
        sufixo="dias"
        valor={rascunho.grace_days}
        limites={LIMITES.diasDeCarencia}
        onChange={(v) => alterar("grace_days", v)}
        ajuda={descreverCarencia(rascunho.grace_days)}
      />

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-small-size)]"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={!mudou}
          isLoading={salvar.isPending}
          onClick={enviar}
        >
          Salvar política
        </Button>
        {mudou ? (
          <button
            type="button"
            onClick={() => {
              setRascunho(data);
              setErro(null);
            }}
            className="text-fg-secondary hover:text-fg text-[length:var(--text-small-size)]"
          >
            Descartar
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Campo({
  id,
  rotulo,
  valor,
  limites,
  onChange,
  ajuda,
  sufixo,
}: {
  id: string;
  rotulo: string;
  valor: number;
  limites: { min: number; max: number };
  onChange: (v: string) => void;
  ajuda: string;
  sufixo?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-fg text-[length:var(--text-small-size)] font-medium"
      >
        {rotulo}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={limites.min}
          max={limites.max}
          value={Number.isNaN(valor) ? "" : valor}
          onChange={(e) => onChange(e.target.value)}
          className={CAMPO_CLASSES}
        />
        {sufixo ? (
          <span className="text-fg-secondary text-[length:var(--text-small-size)]">
            {sufixo}
          </span>
        ) : null}
        <span className="text-fg-muted text-[length:var(--text-caption-size)]">
          de {limites.min} a {limites.max}
        </span>
      </div>
      <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
        {ajuda}
      </p>
    </div>
  );
}
