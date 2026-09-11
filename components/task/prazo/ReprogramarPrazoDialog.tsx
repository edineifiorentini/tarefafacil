"use client";

import {
  IconAlertTriangle,
  IconArrowNarrowRight,
  IconCalendarRepeat,
  IconInfoCircle,
} from "@tabler/icons-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AlertDialog } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { diaCivilEm } from "@/lib/dates/day";
import { useFuso } from "@/lib/queries/useFuso";
import { useReprogramarPrazo } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import {
  MOTIVOS_DE_ESCOLHA,
  REPROGRAMACAO_RECUSADA,
  ROTULO_DO_MOTIVO,
  ehDataDePrazoPlausivel,
  type MotivoDeEscolha,
} from "@/lib/tarefas/reprogramacao";
import { dataPuraBR } from "@/lib/utils/fuso";

export type TarefaParaReprogramar = {
  id: string;
  title: string;
  due_date: string | null;
  prazo_original: string | null;
  /** Encerrada não aparece como atrasada: o prazo virou registro. */
  completed_at?: string | null;
  cancelled_at?: string | null;
};

/**
 * Reprogramar um prazo que já existe — com motivo (0099).
 *
 * **Aprovado pelo dono em 11/set/2026.** O caso de origem: o crachá do
 * Conselho Tutelar atrasou porque o cliente pediu mudanças pelo WhatsApp.
 * Editar a data apagava essa história e fazia a entrega atrasada contar
 * como pontual.
 *
 * Abre de dois lugares: a data da tarefa aberta e o soltar no Calendário
 * (que chega com a data nova já preenchida). Criar a tarefa e o "É para
 * hoje" não passam por aqui — definem o PRIMEIRO prazo, que não é
 * reprogramação.
 *
 * Deixar a data em branco tira o prazo, e também pede motivo: tirar o prazo
 * de uma demanda atrasada é o jeito mais rápido de esconder o atraso.
 */
export function ReprogramarPrazoDialog({
  open,
  onOpenChange,
  tarefa,
  novaDataSugerida,
  onReprogramado,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  tarefa: TarefaParaReprogramar | null;
  /** O Calendário manda o dia em que a demanda foi solta. */
  novaDataSugerida?: string | null;
  onReprogramado?: (novoPrazo: string | null) => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[var(--z-confirmacao-fundo)] bg-black/40 data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
        <AlertDialog.Content
          // O foco vai para a data, e não para "Cancelar" como num alerta
          // comum: quem abriu esta janela veio mudar o prazo.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="tf-glass-strong fixed top-1/2 left-1/2 z-[var(--z-confirmacao)] max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg p-6 data-[state=closed]:[animation:tf-dialog-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-dialog-in_var(--dur-base)_var(--ease-out)]"
        >
          {/* O formulário mora dentro do conteúdo, que desmonta ao fechar:
              cada abertura começa limpa, sem efeito para zerar estado. */}
          {tarefa ? (
            <Formulario
              tarefa={tarefa}
              novaDataSugerida={novaDataSugerida ?? null}
              onFechar={() => onOpenChange(false)}
              onReprogramado={onReprogramado}
            />
          ) : null}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function Formulario({
  tarefa,
  novaDataSugerida,
  onFechar,
  onReprogramado,
}: {
  tarefa: TarefaParaReprogramar;
  novaDataSugerida: string | null;
  onFechar: () => void;
  onReprogramado?: (novoPrazo: string | null) => void;
}) {
  const workspace = useWorkspace();
  const fuso = useFuso();
  const reprogramar = useReprogramarPrazo(workspace.id);
  const toast = useToast();
  const base = useId();
  const dataRef = useRef<HTMLInputElement>(null);
  const primeiroMotivoRef = useRef<HTMLInputElement>(null);

  const [novaData, setNovaData] = useState(
    novaDataSugerida ?? tarefa.due_date ?? ""
  );
  const [motivo, setMotivo] = useState<MotivoDeEscolha | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    dataRef.current?.focus();
  }, []);

  const original = tarefa.prazo_original ?? tarefa.due_date;
  const tirando = novaData === "";
  const encerrada = !!(tarefa.completed_at || tarefa.cancelled_at);
  // O dia de quem lê, pela preferência salva — não pelo aparelho (regra 15).
  const diasDeAtraso =
    tarefa.due_date && !encerrada
      ? differenceInCalendarDays(
          parseISO(diaCivilEm(new Date(), fuso)),
          parseISO(tarefa.due_date)
        )
      : 0;

  function recusar(mensagem: string, campo: HTMLInputElement | null) {
    setErro(mensagem);
    // Quem não enxerga a mensagem chega direto ao campo que falta acertar.
    campo?.focus();
  }

  function confirmar() {
    if (!tarefa.due_date) {
      recusar(
        "Esta demanda ainda não tem prazo. Defina o prazo no campo da tarefa.",
        dataRef.current
      );
      return;
    }
    if (novaData && !ehDataDePrazoPlausivel(novaData)) {
      recusar("Confira o ano do novo prazo.", dataRef.current);
      return;
    }
    if (novaData === tarefa.due_date) {
      recusar(
        "O novo prazo é igual ao atual. Escolha outra data.",
        dataRef.current
      );
      return;
    }
    if (!motivo) {
      recusar("Escolha o motivo da reprogramação.", primeiroMotivoRef.current);
      return;
    }
    setErro(null);
    reprogramar.mutate(
      {
        id: tarefa.id,
        prazo: novaData || null,
        motivo,
        observacao: observacao.trim() || null,
      },
      {
        onSuccess: () => {
          toast.show({
            message: tirando
              ? "Prazo retirado"
              : `Prazo reprogramado para ${dataPuraBR(novaData)}`,
          });
          onReprogramado?.(novaData || null);
          onFechar();
        },
        onError: (e) =>
          setErro(
            e instanceof Error && e.message === REPROGRAMACAO_RECUSADA
              ? REPROGRAMACAO_RECUSADA
              : "Não foi possível reprogramar o prazo. Confira a conexão e tente de novo."
          ),
      }
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-medium">
          Reprogramar prazo
        </AlertDialog.Title>
        <AlertDialog.Description className="text-fg-secondary mt-1 wrap-anywhere">
          {tarefa.title}
        </AlertDialog.Description>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-fg text-[length:var(--text-small-size)] font-medium">
            Prazo atual
          </span>
          <span className="text-fg-secondary tnum flex h-10 items-center text-[length:var(--text-body-size)]">
            {tarefa.due_date ? dataPuraBR(tarefa.due_date) : "Sem prazo"}
          </span>
          {diasDeAtraso > 0 ? (
            <span className="bg-overdue-bg text-overdue inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)]">
              <IconAlertTriangle size={12} stroke={1.5} aria-hidden />
              {`Atrasada há ${diasDeAtraso} ${diasDeAtraso === 1 ? "dia" : "dias"}`}
            </span>
          ) : null}
        </div>
        <IconArrowNarrowRight
          size={18}
          stroke={1.5}
          aria-hidden
          className="text-fg-muted mt-9"
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${base}-data`}
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            Novo prazo
          </label>
          <TextInput
            ref={dataRef}
            id={`${base}-data`}
            type="date"
            value={novaData}
            onChange={(e) => {
              setNovaData(e.target.value);
              setErro(null);
            }}
          />
          {tirando ? (
            <span className="text-fg-muted text-[length:var(--text-caption-size)]">
              Sem data, a demanda fica sem prazo.
            </span>
          ) : null}
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-fg mb-1.5 text-[length:var(--text-small-size)] font-medium">
          Motivo{" "}
          <span className="text-fg-muted font-normal">— obrigatório</span>
        </legend>
        {MOTIVOS_DE_ESCOLHA.map((m, i) => (
          <label
            key={m}
            className="border-line-strong bg-card text-fg hover:bg-hover flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] has-[:checked]:border-[var(--chip-selected-border)] has-[:checked]:bg-[var(--chip-selected-bg)] has-[:checked]:font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]"
          >
            <input
              ref={i === 0 ? primeiroMotivoRef : undefined}
              type="radio"
              name={`${base}-motivo`}
              value={m}
              checked={motivo === m}
              onChange={() => {
                setMotivo(m);
                setErro(null);
              }}
              className="h-4 w-4 accent-[var(--button-primary-bg)]"
            />
            {ROTULO_DO_MOTIVO[m]}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${base}-obs`}
          className="text-fg text-[length:var(--text-small-size)] font-medium"
        >
          Observação{" "}
          <span className="text-fg-muted font-normal">— opcional</span>
        </label>
        <Textarea
          id={`${base}-obs`}
          autogrow
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: combinado pelo WhatsApp em 10/09 — trocar a foto e o cargo."
        />
      </div>

      {original ? (
        <p className="bg-sunken text-fg-secondary flex items-start gap-2 rounded-sm px-3 py-2 text-[length:var(--text-caption-size)]">
          <IconInfoCircle
            size={16}
            stroke={1.5}
            aria-hidden
            className="text-fg-muted mt-px shrink-0"
          />
          <span>
            O prazo original ({dataPuraBR(original)}) continua guardado e segue
            valendo para a pontualidade no prazo original.
          </span>
        </p>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <AlertDialog.Cancel asChild>
          <Button variant="ghost">Cancelar</Button>
        </AlertDialog.Cancel>
        <Button
          variant="primary"
          leadingIcon={IconCalendarRepeat}
          isLoading={reprogramar.isPending}
          onClick={confirmar}
        >
          {tirando ? "Tirar o prazo" : "Reprogramar prazo"}
        </Button>
      </div>
    </div>
  );
}
