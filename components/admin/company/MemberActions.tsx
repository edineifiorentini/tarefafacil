"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { DropdownMenu, Dialog } from "radix-ui";
import { IconCheck, IconCopy, IconDots } from "@tabler/icons-react";

import { useToast } from "@/components/ui/Toast";
import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import {
  ACOES_DE_MEMBRO,
  deixariaSemDono,
  PAPEIS_ATRIBUIVEIS,
  PAPEL_LABEL,
  type AcaoDeMembro,
} from "@/lib/admin/members";
import type { MembroDaEmpresa } from "@/lib/admin/company";

/**
 * Ações de um membro (especificação 10.4).
 *
 * A lista sai do estado da pessoa: bloquear e desbloquear nunca aparecem
 * juntos, transferir propriedade some para quem já é dono ou ainda não
 * aceitou o convite, e a única pessoa dona não pode ser removida nem
 * rebaixada — a trava está aqui e, de verdade, no servidor.
 */
export function MemberActions({
  empresaId,
  empresaNome,
  membro,
  totalDeDonos,
}: {
  empresaId: string;
  empresaNome: string;
  membro: MembroDaEmpresa;
  totalDeDonos: number;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [aberta, setAberta] = useState<AcaoDeMembro | null>(null);
  const [motivo, setMotivo] = useState("");
  const [papel, setPapel] = useState<string>(
    membro.papel === "owner" ? "admin" : membro.papel
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const ehDonoUnico = membro.papel === "owner" && totalDeDonos <= 1;

  const disponiveis: AcaoDeMembro[] = [
    ...(deixariaSemDono("alterar_papel", membro.papel, totalDeDonos)
      ? []
      : (["alterar_papel"] as AcaoDeMembro[])),
    ...(membro.papel !== "owner" && membro.situacao === "active"
      ? (["transferir_propriedade"] as AcaoDeMembro[])
      : []),
    ...(membro.bloqueado
      ? (["desbloquear"] as AcaoDeMembro[])
      : (["bloquear"] as AcaoDeMembro[])),
    "link_de_senha",
    ...(deixariaSemDono("remover", membro.papel, totalDeDonos)
      ? []
      : (["remover"] as AcaoDeMembro[])),
  ];

  function fechar() {
    setAberta(null);
    setMotivo("");
    setErro(null);
    setLinkGerado(null);
    setCopiado(false);
  }

  async function confirmar() {
    if (!aberta) return;
    const limpo = motivo.trim();
    if (ACOES_DE_MEMBRO[aberta].exigeMotivo && limpo.length < MOTIVO_MINIMO) {
      setErro(
        limpo.length === 0
          ? "Escreva o motivo desta ação"
          : `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`
      );
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/companies/${empresaId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acao: aberta,
          motivo: limpo,
          userId: membro.userId,
          papel,
        }),
      });
      const corpo = (await res.json()) as { message?: string; link?: string };
      if (!res.ok) {
        setErro(corpo.message ?? "Não foi possível concluir. Tente de novo.");
        return;
      }

      if (corpo.link) {
        // O link fica na tela até a pessoa fechar: some numa notificação de
        // três segundos seria perdê-lo, e ele não pode ser gerado de novo
        // sem invalidar o anterior.
        setLinkGerado(corpo.link);
        router.refresh();
        return;
      }

      show({ message: `${ACOES_DE_MEMBRO[aberta].label} concluída` });
      fechar();
      router.refresh();
    } catch {
      setErro("Sem resposta do servidor. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarLink() {
    if (!linkGerado) return;
    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // O link está visível no campo para seleção manual.
    }
  }

  const definicao = aberta ? ACOES_DE_MEMBRO[aberta] : null;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={`Ações de ${membro.nome ?? membro.email}`}
          className="text-fg-muted hover:bg-hover hover:text-fg rounded-sm p-1.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <IconDots size={18} stroke={1.75} aria-hidden />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="tf-glass-strong border-line z-50 min-w-52 rounded-md border p-1 shadow-[var(--shadow-glass)]"
          >
            {disponiveis.map((a) => (
              <DropdownMenu.Item
                key={a}
                onSelect={() => setAberta(a)}
                className={`data-[highlighted]:bg-hover flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none ${
                  ACOES_DE_MEMBRO[a].destrutiva
                    ? "text-[var(--negative)]"
                    : "text-fg"
                }`}
              >
                {ACOES_DE_MEMBRO[a].label}
              </DropdownMenu.Item>
            ))}
            {ehDonoUnico ? (
              <p className="text-fg-muted px-2 py-1.5 text-[length:var(--text-caption-size)]">
                Única pessoa dona: transfira a propriedade para poder remover ou
                rebaixar.
              </p>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={!!aberta} onOpenChange={(o) => !o && fechar()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 outline-none data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                {definicao?.titulo}
              </Dialog.Title>
              <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
                {membro.nome ?? membro.email} em {empresaNome} —{" "}
                {definicao?.consequencia}
              </Dialog.Description>
            </div>

            {linkGerado ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="link-senha"
                    className="text-fg text-[length:var(--text-small-size)] font-medium"
                  >
                    Link de uso único
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="link-senha"
                      readOnly
                      value={linkGerado}
                      onFocus={(e) => e.currentTarget.select()}
                      className="border-line bg-card text-fg min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    />
                    <button
                      type="button"
                      onClick={() => void copiarLink()}
                      className="border-line hover:bg-hover text-fg-secondary flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      {copiado ? (
                        <IconCheck size={16} stroke={2} aria-hidden />
                      ) : (
                        <IconCopy size={16} stroke={1.75} aria-hidden />
                      )}
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
                <p className="text-[length:var(--text-caption-size)] text-[var(--negative)]">
                  Este link vale como senha: quem o tiver define o acesso da
                  conta. Entregue por um canal privado e não guarde cópia.
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={fechar}
                    className="rounded-md bg-[var(--button-primary-bg)] px-3 py-2 text-[length:var(--text-small-size)] font-medium text-[var(--button-primary-fg)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    Já copiei, fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                {aberta === "alterar_papel" ? (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="membro-papel"
                      className="text-fg text-[length:var(--text-small-size)] font-medium"
                    >
                      Papel novo
                    </label>
                    <select
                      id="membro-papel"
                      value={papel}
                      onChange={(e) => setPapel(e.target.value)}
                      className="border-line bg-card text-fg rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      {PAPEIS_ATRIBUIVEIS.map((p) => (
                        <option key={p} value={p}>
                          {PAPEL_LABEL[p]}
                        </option>
                      ))}
                    </select>
                    <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                      Dono não está na lista: ele se define transferindo a
                      propriedade, que é uma ação com outro peso.
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="membro-motivo"
                    className="text-fg text-[length:var(--text-small-size)] font-medium"
                  >
                    Motivo
                  </label>
                  <textarea
                    id="membro-motivo"
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Por que esta ação está sendo feita"
                    className="border-line bg-card text-fg placeholder:text-fg-muted rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  />
                  <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                    Fica na auditoria com o seu nome e a data.
                  </p>
                </div>

                {erro ? (
                  <p
                    role="alert"
                    className="text-[length:var(--text-small-size)] text-[var(--negative)]"
                  >
                    {erro}
                  </p>
                ) : null}

                <div className="mt-2 flex justify-end gap-2">
                  <Dialog.Close className="border-line hover:bg-hover text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
                    Cancelar
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={() => void confirmar()}
                    disabled={enviando}
                    className={`rounded-md px-3 py-2 text-[length:var(--text-small-size)] font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-60 ${
                      definicao?.destrutiva
                        ? "bg-[var(--button-danger-bg)] text-[var(--button-danger-fg)]"
                        : "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)]"
                    }`}
                  >
                    {enviando ? "Salvando…" : definicao?.label}
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
