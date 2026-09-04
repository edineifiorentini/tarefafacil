"use client";

import { useState } from "react";

import { IconDeviceLaptop } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  deslocamentoDe,
  fusoDoAparelho,
  opcoesDeFuso,
} from "@/lib/dates/fusos";
import { useFuso } from "@/lib/queries/useFuso";
import { createClient } from "@/lib/supabase/client";

/**
 * O fuso da pessoa.
 *
 * **A coluna `app_user.timezone` existia desde a migration 0001 e nada na
 * interface a alterava** — só o envio ao Google Agenda a lia. Este cartão é
 * o que a torna real, e sem ele a fase 1 seria uma regressão: o app passou a
 * seguir o valor salvo, que para todo mundo ainda é o padrão de Brasília.
 *
 * O fuso decide o que "hoje", "atrasada" e "vence hoje" querem dizer. Em
 * Manaus, Rio Branco ou Noronha, seguir Brasília erra a virada do dia.
 *
 * **O aparelho sugere, a pessoa decide.** O navegador sabe onde ela está
 * agora e isso vale como atalho — mas quem escolheu continua escolhido ao
 * abrir num computador emprestado ou num aparelho que voltou de viagem.
 */
export function TimezoneCard() {
  const salvo = useFuso();
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const [escolha, setEscolha] = useState(salvo);
  const [salvando, setSalvando] = useState(false);

  const doAparelho = fusoDoAparelho();
  const opcoes = opcoesDeFuso(salvo, doAparelho);
  const mudou = escolha !== salvo;
  // Só oferece o do aparelho quando ele diverge do que está escolhido —
  // um atalho que não muda nada é ruído.
  const sugestao =
    doAparelho && doAparelho !== escolha ? doAparelho : null;

  async function salvar() {
    if (!mudou || salvando) return;
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSalvando(false);
      toast.show({ message: "Sessão expirada. Entre de novo." });
      return;
    }

    const { error } = await supabase
      .from("app_user")
      .update({ timezone: escolha })
      .eq("id", user.id);

    setSalvando(false);
    if (error) {
      toast.show({ message: "Não foi possível salvar o fuso." });
      return;
    }

    // `useFuso` é semeado pelo layout do servidor, não por consulta do
    // cliente: sem o refresh, a tela continuaria calculando "hoje" pelo
    // fuso antigo até alguém recarregar na mão.
    router.refresh();
    toast.show({ message: "Fuso horário atualizado" });
  }

  return (
    <section className="border-line bg-card flex max-w-xl flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-fg font-medium">Fuso horário</h2>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Define o que &ldquo;hoje&rdquo;, &ldquo;vence hoje&rdquo; e
          &ldquo;atrasada&rdquo; querem dizer para você. O Brasil tem quatro
          fusos.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="fuso-horario"
          className="text-fg text-[length:var(--text-small-size)] font-medium"
        >
          Seu fuso
        </label>
        <Select
          id="fuso-horario"
          options={opcoes}
          value={escolha}
          onValueChange={setEscolha}
        />
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Agora são {deslocamentoDe(escolha)} neste fuso.
        </p>
      </div>

      {sugestao ? (
        <button
          type="button"
          onClick={() => setEscolha(sugestao)}
          className="text-fg-secondary hover:text-fg inline-flex items-center gap-2 self-start text-[length:var(--text-small-size)] underline"
        >
          <IconDeviceLaptop size={15} stroke={1.75} aria-hidden />
          Este aparelho está em {sugestao.replace(/_/g, " ")} — usar esse
        </button>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => void salvar()}
          disabled={!mudou || salvando}
        >
          {salvando ? "Salvando…" : "Salvar fuso"}
        </Button>
        {mudou ? (
          <button
            type="button"
            onClick={() => setEscolha(salvo)}
            className="text-fg-secondary hover:text-fg text-[length:var(--text-small-size)]"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </section>
  );
}
