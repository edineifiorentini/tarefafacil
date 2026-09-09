"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { ModalFrame } from "@/components/shell/ModalFrame";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { useClients } from "@/lib/queries/useClients";
import { useMembers } from "@/lib/queries/useMembers";
import { useProjects } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import { useCreateTask } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sectorOptions } from "@/lib/sectors/options";
import { quickAddSchema, type QuickAddInput } from "@/lib/validation/task";

import { SectorForm } from "@/components/sector/SectorForm";

/** "Nenhum" precisa de um valor: Radix Select não aceita item com value "". */
const NENHUM = "__none__";

const PRIORIDADES = [
  { value: "sem_prioridade", label: "Sem prioridade" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-fg-secondary text-[length:var(--text-caption-size)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function QuickAdd({
  defaultSectorId,
  onCriada,
}: {
  defaultSectorId?: string;
  /**
   * A tarefa nasceu. Quem abriu o formulário decide o que fazer com ela.
   *
   * O formulário NÃO abre a tarefa sozinho de propósito: ele não deveria
   * conhecer o recipiente em que está, e conhecê-lo fecharia um ciclo de
   * imports com o hook que o monta.
   */
  onCriada?: (taskId: string) => void;
}) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const { data: projects = [] } = useProjects(workspace.id);
  const createTask = useCreateTask(workspace.id);
  const toast = useToast();
  const { openModal, closeModal } = useShell();

  // Fechado por padrão: o caminho rápido é o que faz este formulário valer.
  // **Nasce ABERTO desde 9/set/2026.** Fechado fazia sentido no painel de
  // 400px, onde tudo junto virava rolagem; no modal há espaço, e obrigar um
  // clique para ver prioridade, cliente e descrição só escondia o
  // formulário de quem já sabia que ia usá-lo.
  const [detalhes, setDetalhes] = useState(true);

  // Subtarefas digitadas antes de a demanda existir. Ficam aqui até o
  // insert, porque `subtask.task_id` aponta para uma tarefa que ainda não
  // tem id.
  const [subtarefas, setSubtarefas] = useState<string[]>([]);
  const [novaSubtarefa, setNovaSubtarefa] = useState("");
  const [gerarLink, setGerarLink] = useState(false);

  function adicionarSubtarefa() {
    const t = novaSubtarefa.trim();
    if (!t) return;
    setSubtarefas((atuais) => [...atuais, t]);
    setNovaSubtarefa("");
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<QuickAddInput>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      title: "",
      sector_id: defaultSectorId ?? sectors[0]?.id ?? "",
      due_date: "",
      priority: "media",
      assignee_id: null,
      client_id: null,
      project_id: null,
      service: "",
      description: "",
      estimate_hours: "",
    },
  });

  const sectorId = useWatch({ control, name: "sector_id" });
  const priority = useWatch({ control, name: "priority" });
  const assigneeId = useWatch({ control, name: "assignee_id" });
  const clientId = useWatch({ control, name: "client_id" });
  const projectId = useWatch({ control, name: "project_id" });
  const descricao = useWatch({ control, name: "description" });

  function onSubmit(data: QuickAddInput) {
    createTask.mutate(
      { ...data, due_date: data.due_date || null, subtarefas, gerarLink },
      {
        onSuccess: (task) => {
          // Sem isto o botão não dava sinal nenhum de vida e a pessoa ficava
          // sem saber se a tarefa foi criada. O nome do setor no texto é o
          // que confirma que ela foi parar no lugar certo.
          setSubtarefas([]);
          setNovaSubtarefa("");
          setGerarLink(false);

          // A demanda existe mesmo quando o que vinha junto falhou. Dizer
          // qual parte não veio é melhor que um "criada" que esconde a
          // metade que faltou.
          if (task.naoVeio.length > 0) {
            toast.show({
              message: `Tarefa criada, mas não foi possível criar ${task.naoVeio.join(" e ")}.`,
              duration: 8000,
            });
            return;
          }

          const setor = sectors.find((x) => x.id === data.sector_id)?.name;
          toast.show({
            message: setor ? `Tarefa criada em ${setor}` : "Tarefa criada",
            actionLabel: "Ver tarefa",
            // 6s em vez de 5: este aviso tem ação, e ação precisa de tempo
            // para ser notada e alcançada.
            duration: 6000,
            onAction: () => onCriada?.(task.id),
          });
        },
        onError: () =>
          toast.show({ message: "Não foi possível criar a tarefa" }),
      }
    );
    // Registro em sequência: limpa só o que é único de cada tarefa (título,
    // descrição, estimativa) e mantém o enquadramento — setor, prazo,
    // prioridade, responsável, cliente, projeto e tipo. Quem está lançando as
    // demandas da semana de um cliente não quer reescolher o cliente sete
    // vezes.
    reset({
      ...data,
      title: "",
      description: "",
      estimate_hours: "",
    });
    setFocus("title");
  }

  // Workspace novo já nasce com um setor (migration 0043), então isto só
  // aparece se alguém apagar todos. Ainda assim é um botão, não uma frase:
  // um aviso que manda fazer algo sem oferecer o caminho é um beco sem saída.
  if (sectors.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Tarefas ficam dentro de um setor, e não há nenhum ainda.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            openModal({
              titulo: "Novo setor",
              largura: "media",
              node: (
                <ModalFrame titulo="Novo setor">
                  <SectorForm mode="create" onDone={closeModal} />
                </ModalFrame>
              ),
            })
          }
        >
          Criar setor
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <TextInput
        {...register("title")}
        placeholder="Título da tarefa"
        aria-label="Título da tarefa"
        error={!!errors.title}
        autoFocus
      />
      {errors.title ? (
        <span
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {errors.title.message}
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            options={sectorOptions(sectors)}
            value={sectorId}
            onValueChange={(v) =>
              setValue("sector_id", v, { shouldValidate: true })
            }
            placeholder="Setor"
            aria-label="Setor"
            error={!!errors.sector_id}
          />
        </div>
        <div className="w-40 shrink-0">
          <TextInput type="date" {...register("due_date")} aria-label="Prazo" />
        </div>
        <Button type="submit" variant="primary">
          Criar
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setDetalhes((v) => !v)}
        aria-expanded={detalhes}
        className="text-fg-secondary hover:text-fg flex w-fit items-center gap-1 rounded-sm text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <IconChevronDown
          size={14}
          stroke={1.5}
          className={`transition-transform [transition-duration:var(--dur-fast)] ${
            detalhes ? "rotate-180" : ""
          }`}
          aria-hidden
        />
        Mais detalhes
      </button>

      {detalhes ? (
        <div className="border-line flex flex-col gap-3 border-t pt-3">
          <div className="flex gap-2">
            <Campo label="Prioridade">
              <Select
                options={PRIORIDADES}
                value={priority ?? "media"}
                onValueChange={(v) =>
                  setValue("priority", v as QuickAddInput["priority"])
                }
                aria-label="Prioridade"
              />
            </Campo>
            <Campo label="Responsável">
              <Select
                options={[
                  { value: NENHUM, label: "Ninguém" },
                  ...members.map((m) => ({
                    value: m.user_id,
                    label: m.display_name ?? m.email,
                  })),
                ]}
                value={assigneeId ?? NENHUM}
                onValueChange={(v) =>
                  setValue("assignee_id", v === NENHUM ? null : v)
                }
                aria-label="Responsável"
              />
            </Campo>
          </div>

          <div className="flex gap-2">
            <Campo label="Cliente">
              <Select
                options={[
                  { value: NENHUM, label: "Nenhum" },
                  ...clients.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={clientId ?? NENHUM}
                onValueChange={(v) =>
                  setValue("client_id", v === NENHUM ? null : v)
                }
                aria-label="Cliente"
              />
            </Campo>
            <Campo label="Projeto">
              <Select
                options={[
                  { value: NENHUM, label: "Nenhum" },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={projectId ?? NENHUM}
                onValueChange={(v) =>
                  setValue("project_id", v === NENHUM ? null : v)
                }
                aria-label="Projeto"
              />
            </Campo>
          </div>

          <div className="flex gap-2">
            <Campo label="Tipo de demanda">
              <TextInput
                {...register("service")}
                placeholder="Ex.: post, banner"
                aria-label="Tipo de demanda"
              />
            </Campo>
            <div className="w-28 shrink-0">
              <Campo label="Estimativa (h)">
                <TextInput
                  inputMode="decimal"
                  {...register("estimate_hours")}
                  placeholder="Ex.: 2.5"
                  aria-label="Estimativa em horas"
                />
              </Campo>
            </div>
          </div>

          <Campo label="Descrição">
            <MarkdownEditor
              value={descricao ?? ""}
              onChange={(v) => setValue("description", v)}
              rows={4}
              placeholder="O que precisa ser feito"
              aria-label="Descrição"
            />
          </Campo>

          <Campo label="Subtarefas">
            <div className="flex flex-col gap-2">
              {subtarefas.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {subtarefas.map((t, i) => (
                    <li
                      key={`${t}-${i}`}
                      className="border-line flex items-center gap-2 rounded-sm border px-2 py-1"
                    >
                      <span className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                        {t}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remover subtarefa ${t}`}
                        onClick={() =>
                          setSubtarefas((atuais) =>
                            atuais.filter((_, j) => j !== i)
                          )
                        }
                        className="text-fg-muted hover:text-fg rounded-sm p-1"
                      >
                        <IconX size={14} stroke={1.5} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex items-center gap-2">
                <TextInput
                  size="sm"
                  value={novaSubtarefa}
                  onChange={(e) => setNovaSubtarefa(e.target.value)}
                  // Enter adiciona a subtarefa e NÃO envia o formulário —
                  // sem isto, digitar a primeira criaria a tarefa sem as
                  // outras.
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    adicionarSubtarefa();
                  }}
                  placeholder="Adicionar subtarefa"
                  aria-label="Nova subtarefa"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={adicionarSubtarefa}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </Campo>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={gerarLink}
              onChange={(e) => setGerarLink(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--fill-brand)]"
            />
            <span>
              <span className="text-fg block text-[length:var(--text-small-size)]">
                Gerar link de acompanhamento para o cliente
              </span>
              <span className="text-fg-secondary block text-[length:var(--text-caption-size)]">
                Vale 30 dias. O cliente vê só o que for publicado na aba
                Aprovação — nenhum anexo interno.
              </span>
            </span>
          </label>

          {/* Anexo e tag continuam fora: precisam da tarefa salva para se
              pendurar nela, e não têm como ser digitados antes. Subtarefa e
              link entraram porque dá para juntar a informação agora e
              criá-los logo depois do insert. */}
        </div>
      ) : null}
    </form>
  );
}
