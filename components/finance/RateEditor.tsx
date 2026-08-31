"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/components/ui/Toast";
import { centsToMaskedInput, parseCurrencyToCents } from "@/lib/finance/money";
import { useMembers } from "@/lib/queries/useMembers";
import { useFinanceRates, useSalvarPreco } from "@/lib/queries/useProfitability";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * Cadastro do valor por hora (0081).
 *
 * **Não existe interruptor de "usar custo/hora", e a ausência é a feature.**
 * Quem não preenche nada vê rentabilidade só de dinheiro; quem preenche o
 * padrão passa a ver o custo do trabalho. Uma chave separada faria o mesmo
 * número significar duas coisas conforme uma configuração — e todo relatório
 * passado mudaria quando alguém a virasse.
 *
 * Fica dentro da rentabilidade, e não em Configurações, porque é aqui que a
 * falta dele aparece: o aviso "12h não entraram no custo" e o campo que
 * resolve isso precisam estar na mesma tela.
 */

/** Fechado por padrão: a maioria configura uma vez e não volta. */
export function RateEditor() {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: rates = [] } = useFinanceRates(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const salvar = useSalvarPreco(workspace.id);

  const [aberto, setAberto] = useState(false);

  const padrao = rates.find((r) => r.user_id === null);
  const [valorPadrao, setValorPadrao] = useState(
    padrao ? centsToMaskedInput(padrao.hora_cents) : ""
  );

  function gravar(userId: string | null, texto: string) {
    const cents = parseCurrencyToCents(texto);
    salvar.mutate(
      // Vazio APAGA em vez de gravar zero: hora sem preço é "não sei quanto
      // custa", e zero seria "de graça" — que entra na margem inflando-a.
      { userId, horaCents: cents && cents > 0 ? cents : null },
      {
        onSuccess: () =>
          toast.show({
            message: cents ? "Valor por hora salvo" : "Valor por hora removido",
          }),
        onError: () => toast.show({ message: "Não foi possível salvar" }),
      }
    );
  }

  if (!aberto) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {padrao
            ? `Valor por hora: ${centsToMaskedInput(padrao.hora_cents)} por padrão`
            : "Nenhum valor por hora cadastrado"}
        </p>
        <Button variant="ghost" onClick={() => setAberto(true)}>
          {padrao ? "Ajustar valores" : "Cadastrar valor por hora"}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-line flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-fg font-medium">Valor por hora</h3>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Sem nenhum valor, a rentabilidade conta só dinheiro
          </p>
        </div>
        <Button variant="ghost" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Padrão da empresa
        </span>
        <div className="flex items-center gap-2">
          <CurrencyInput
            value={valorPadrao}
            onChange={setValorPadrao}
            aria-label="Valor por hora padrão da empresa"
          />
          <Button
            variant="secondary"
            disabled={salvar.isPending}
            onClick={() => gravar(null, valorPadrao)}
          >
            Salvar
          </Button>
        </div>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Exceções por pessoa
        </span>
        {members.map((m) => (
          <LinhaDaPessoa
            key={m.user_id}
            nome={m.display_name ?? m.email}
            atual={rates.find((r) => r.user_id === m.user_id)?.hora_cents ?? null}
            salvando={salvar.isPending}
            onSalvar={(texto) => gravar(m.user_id, texto)}
          />
        ))}
      </div>
    </div>
  );
}

function LinhaDaPessoa({
  nome,
  atual,
  salvando,
  onSalvar,
}: {
  nome: string;
  atual: number | null;
  salvando: boolean;
  onSalvar: (texto: string) => void;
}) {
  const [valor, setValor] = useState(atual ? centsToMaskedInput(atual) : "");

  return (
    <div className="flex items-center gap-2">
      <span className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
        {nome}
      </span>
      {/* Vazio significa "usa o padrão da empresa" — o CurrencyInput não
          aceita placeholder, então quem explica isso é o rótulo da seção. */}
      <CurrencyInput
        value={valor}
        onChange={setValor}
        aria-label={`Valor por hora de ${nome} (vazio usa o padrão)`}
      />
      <Button
        variant="ghost"
        disabled={salvando}
        onClick={() => onSalvar(valor)}
      >
        Salvar
      </Button>
    </div>
  );
}
