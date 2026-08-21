"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import {
  centsToMaskedInput,
  formatCentsBRL,
  parseCurrencyToCents,
} from "@/lib/finance/money";
import { useClients, useCreateClient } from "@/lib/queries/useClients";
import { useCreateDeal, useUpdateDeal } from "@/lib/queries/useDeals";
import { useMembers } from "@/lib/queries/useMembers";
import { useServices } from "@/lib/queries/useServices";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Deal, PipelineStage } from "@/types/database";

// Somar serviços exige ler o campo mascarado de volta em centavos; vazio
// é zero, não erro.
function centsDe(masked: string): number {
  return masked ? (parseCurrencyToCents(masked) ?? 0) : 0;
}

const NOVO = "__novo__";
const SEM_RESPONSAVEL = "__ninguem__";

/**
 * Criar ou editar negociação.
 *
 * A decisão que dá forma a esta tela: **não existe cadastro de contato
 * paralelo**. Ou a negociação aponta para um cliente que já existe, ou o
 * formulário cadastra um novo como "prospecto" na mesma ação. Um CRM com
 * duas listas de gente — "leads" de um lado, "clientes" de outro — é o jeito
 * conhecido de acabar com o mesmo telefone em dois lugares e nenhum deles
 * confiável.
 */
export function DealForm({
  stages,
  deal,
  defaultStageId,
  onDone,
}: {
  stages: PipelineStage[];
  /** Sem isto, é criação. */
  deal?: Deal;
  defaultStageId?: string;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: clients = [] } = useClients(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const { data: servicos = [] } = useServices(workspace.id);
  const criarCliente = useCreateClient(workspace.id);
  const criarDeal = useCreateDeal(workspace.id);
  const atualizarDeal = useUpdateDeal(workspace.id);

  const editando = !!deal;
  const [clientId, setClientId] = useState(deal?.client_id ?? NOVO);
  const [novoCliente, setNovoCliente] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [title, setTitle] = useState(deal?.title ?? "");
  const [valor, setValor] = useState(
    deal?.amount_cents != null ? centsToMaskedInput(deal.amount_cents) : ""
  );
  const [stageId, setStageId] = useState(
    deal?.stage_id ?? defaultStageId ?? stages[0]?.id ?? ""
  );
  const [responsavel, setResponsavel] = useState(
    deal?.responsible_id ?? SEM_RESPONSAVEL
  );
  const [previsao, setPrevisao] = useState(deal?.expected_close_on ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? "");

  const servicosAtivos = servicos.filter((s) => s.active);
  const criandoCliente = clientId === NOVO;
  const pode =
    title.trim().length > 0 &&
    (criandoCliente ? novoCliente.trim().length > 0 : true) &&
    !!stageId;
  const salvando =
    criarDeal.isPending || atualizarDeal.isPending || criarCliente.isPending;

  async function submit() {
    if (!pode || salvando) return;
    const amountCents = valor ? parseCurrencyToCents(valor) : null;
    const responsibleId = responsavel === SEM_RESPONSAVEL ? null : responsavel;

    try {
      if (editando) {
        await atualizarDeal.mutateAsync({
          id: deal.id,
          patch: {
            title: title.trim(),
            amount_cents: amountCents,
            responsible_id: responsibleId,
            expected_close_on: previsao || null,
            notes: notes.trim() || null,
            ...(criandoCliente ? {} : { client_id: clientId }),
          },
        });
        toast.show({ message: "Negociação atualizada" });
        onDone();
        return;
      }

      // Cliente novo entra como prospecto: ele ainda não comprou nada, e é
      // exatamente isso que o funil vai decidir.
      let alvo = clientId;
      if (criandoCliente) {
        const criado = await criarCliente.mutateAsync({
          name: novoCliente.trim(),
          type: "pj",
          status: "prospecto",
          phone: novoTelefone.trim() || null,
          email: novoEmail.trim() || null,
        });
        alvo = criado.id;
      }

      await criarDeal.mutateAsync({
        clientId: alvo,
        stageId,
        title: title.trim(),
        amountCents,
        responsibleId,
        expectedCloseOn: previsao || null,
        notes: notes.trim() || null,
      });
      toast.show({ message: "Negociação criada" });
      onDone();
    } catch {
      toast.show({ message: "Não foi possível salvar a negociação" });
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4 p-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Cliente
        </span>
        <Select
          options={[
            { value: NOVO, label: "Cadastrar novo cliente" },
            ...clients.map((c) => ({
              value: c.id,
              label: c.fantasy_name || c.name,
            })),
          ]}
          value={clientId}
          onValueChange={setClientId}
          aria-label="Cliente da negociação"
        />
      </label>

      {criandoCliente ? (
        <div className="border-line bg-sunken flex flex-col gap-3 rounded-md border p-3">
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            Entra na lista de clientes como prospecto. Vira ativo quando a
            negociação for para uma etapa de ganho.
          </p>
          <TextInput
            value={novoCliente}
            onChange={(e) => setNovoCliente(e.target.value)}
            placeholder="Nome ou empresa"
            aria-label="Nome do cliente"
          />
          <div className="flex gap-2">
            <TextInput
              value={novoTelefone}
              onChange={(e) => setNovoTelefone(e.target.value)}
              placeholder="Telefone"
              aria-label="Telefone do cliente"
            />
            <TextInput
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="E-mail"
              aria-label="E-mail do cliente"
            />
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          O que está sendo negociado
        </span>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: identidade visual + 3 meses de social"
          aria-label="Título da negociação"
        />
      </label>

      {servicosAtivos.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Do catálogo
          </span>
          <div className="flex flex-wrap gap-1.5">
            {servicosAtivos.map((s) => (
              <button
                key={s.id}
                type="button"
                // Preenche em vez de vincular: o preço de tabela é ponto de
                // partida da conversa, e quase toda negociação ajusta alguma
                // coisa. O que vale é o que ficou escrito aqui.
                onClick={() => {
                  setTitle((atual) =>
                    atual.trim() ? `${atual.trim()} + ${s.name}` : s.name
                  );
                  setValor((atual) =>
                    centsToMaskedInput(centsDe(atual) + s.price_cents)
                  );
                }}
                className="border-line bg-sunken hover:bg-hover text-fg-secondary hover:text-fg inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)]"
              >
                <span>{s.name}</span>
                <span className="tnum text-fg-muted">
                  {formatCentsBRL(s.price_cents)}
                  {s.unit ? ` ${s.unit}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Valor
          </span>
          <CurrencyInput
            value={valor}
            onChange={setValor}
            aria-label="Valor da negociação"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Previsão de fechamento
          </span>
          <TextInput
            type="date"
            value={previsao}
            onChange={(e) => setPrevisao(e.target.value)}
            aria-label="Previsão de fechamento"
          />
        </label>
      </div>

      {editando ? null : (
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Etapa
          </span>
          <Select
            options={stages.map((s) => ({ value: s.id, label: s.name }))}
            value={stageId}
            onValueChange={setStageId}
            aria-label="Etapa do funil"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Responsável
        </span>
        <Select
          options={[
            { value: SEM_RESPONSAVEL, label: "Ninguém" },
            ...members
              .filter((m) => m.status === "active")
              .map((m) => ({
                value: m.user_id,
                label: m.display_name ?? m.email,
              })),
          ]}
          value={responsavel}
          onValueChange={setResponsavel}
          aria-label="Responsável pela negociação"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Anotações
        </span>
        <Textarea
          autogrow
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="O que foi conversado, o que ficou de fazer"
          aria-label="Anotações da negociação"
        />
      </label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!pode}
          isLoading={salvando}
        >
          {editando ? "Salvar" : "Criar negociação"}
        </Button>
      </div>
    </form>
  );
}
