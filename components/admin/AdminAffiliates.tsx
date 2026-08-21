"use client";

import { IconCopy, IconDotsVertical } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import type { AffiliateRow } from "@/lib/admin/types";
import { formatCentsBRL } from "@/lib/finance/money";

const KEY = ["admin-affiliates"] as const;

const menuItem =
  "cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-hover";

function mensagemDeErro(e: unknown): string {
  if (e instanceof Error && e.message === "code_taken") {
    return "Esse link já é de outro afiliado. Escolha outro.";
  }
  if (e instanceof Error && e.message === "affiliate_in_use") {
    return "Esse afiliado já indicou empresas. Desative em vez de excluir.";
  }
  if (e instanceof Error && e.message) return e.message;
  return "Não foi possível salvar";
}

async function enviar(metodo: "POST" | "PATCH", body: unknown) {
  const res = await fetch("/api/admin/affiliates", {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "falha");
  }
}

function AffiliateRowItem({ affiliate }: { affiliate: AffiliateRow }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(affiliate.name);
  const [code, setCode] = useState(affiliate.code);
  const [percent, setPercent] = useState(String(affiliate.commission_percent));
  const [confirmDelete, setConfirmDelete] = useState(false);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: KEY });
  }

  const save = useMutation({
    mutationFn: (extra: Partial<AffiliateRow> = {}) =>
      enviar("PATCH", {
        id: affiliate.id,
        name: name.trim(),
        code: code.trim(),
        email: affiliate.email,
        phone: affiliate.phone,
        commission_percent: Number(percent),
        active: affiliate.active,
        ...extra,
      }),
    onSuccess: () => {
      toast.show({ message: "Afiliado atualizado" });
      invalidate();
    },
    onError: (e) => toast.show({ message: mensagemDeErro(e) }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/affiliates?id=${affiliate.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) throw new Error("affiliate_in_use");
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Afiliado excluído" });
      invalidate();
    },
    onError: (e) => toast.show({ message: mensagemDeErro(e) }),
  });

  async function copiarLink() {
    const url = `${window.location.origin}/r/${affiliate.code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: "Link copiado" });
    } catch {
      // Navegador sem permissão de área de transferência: mostra a URL para
      // a pessoa copiar na mão em vez de falhar em silêncio.
      toast.show({ message: url });
    }
  }

  const dirty =
    name.trim() !== affiliate.name ||
    code.trim() !== affiliate.code ||
    Number(percent) !== affiliate.commission_percent;
  const valid =
    name.trim().length > 0 &&
    /^[a-z0-9-]{3,32}$/.test(code.trim().toLowerCase()) &&
    Number(percent) >= 0 &&
    Number(percent) <= 100;

  return (
    <tr className="border-line border-t">
      <td className="px-3 py-2">
        <div className="w-48">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`Nome de ${affiliate.name}`}
          />
        </div>
        {affiliate.email || affiliate.phone ? (
          <span className="text-fg-muted text-[length:var(--text-caption-size)]">
            {[affiliate.email, affiliate.phone].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-fg-muted">/r/</span>
          <div className="w-32">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              aria-label={`Link de ${affiliate.name}`}
            />
          </div>
          <button
            type="button"
            onClick={copiarLink}
            aria-label={`Copiar link de ${affiliate.name}`}
            className="text-fg-muted hover:bg-hover hover:text-fg inline-flex h-8 w-8 items-center justify-center rounded-sm"
          >
            <IconCopy size={16} stroke={1.5} />
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex w-24 items-center gap-1">
          <TextInput
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            aria-label={`Comissão de ${affiliate.name}`}
          />
          <span className="text-fg-muted">%</span>
        </div>
      </td>
      <td className="tnum text-fg-secondary px-3 py-2">
        {affiliate.click_count}
      </td>
      <td className="tnum text-fg px-3 py-2">{affiliate.workspace_count}</td>
      <td className="tnum text-fg px-3 py-2">
        {formatCentsBRL(affiliate.commission_cents)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          {!affiliate.active ? (
            <span className="text-fg-muted text-[length:var(--text-caption-size)]">
              Desativado
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            disabled={!dirty || !valid}
            isLoading={save.isPending}
            onClick={() => save.mutate({})}
          >
            Salvar
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Ações de ${affiliate.name}`}
                className="text-fg-muted hover:bg-hover hover:text-fg data-[state=open]:bg-sunken inline-flex h-8 w-8 items-center justify-center rounded-sm"
              >
                <IconDotsVertical size={16} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="tf-glass-strong z-50 min-w-44 overflow-hidden rounded-md p-1 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
              >
                <DropdownMenu.Item
                  onSelect={() => save.mutate({ active: !affiliate.active })}
                  className={menuItem}
                >
                  {affiliate.active ? "Desativar link" : "Reativar link"}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="bg-line my-1 h-px" />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmDelete(true);
                  }}
                  className="text-overdue data-[highlighted]:bg-hover cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                >
                  Excluir afiliado
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <AlertDialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
              <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Excluir {affiliate.name}?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-fg-secondary mt-2">
                O link para de funcionar e os cliques registrados somem. Quem já
                indicou empresa não pode ser excluído — desative.
              </AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="ghost" size="sm">
                    Cancelar
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={remove.isPending}
                    onClick={() => remove.mutate()}
                  >
                    Excluir
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </td>
    </tr>
  );
}

function CreateAffiliate() {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("20");

  const create = useMutation({
    mutationFn: () =>
      enviar("POST", {
        name: name.trim(),
        email: email.trim() || null,
        code: code.trim(),
        commission_percent: Number(percent),
      }),
    onSuccess: () => {
      toast.show({ message: "Afiliado cadastrado" });
      setName("");
      setEmail("");
      setCode("");
      setPercent("20");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e) => toast.show({ message: mensagemDeErro(e) }),
  });

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Cadastrar afiliado
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && code.trim()) create.mutate();
      }}
      className="border-line bg-card flex flex-wrap items-end gap-2 rounded-md border p-3"
    >
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Nome
        <div className="w-48">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Quem divulga"
            aria-label="Nome do afiliado"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        E-mail
        <div className="w-56">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="afiliado@email.com"
            aria-label="E-mail do afiliado"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Link
        <div className="flex items-center gap-1">
          <span className="text-fg-muted">/r/</span>
          <div className="w-32">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              placeholder="joao"
              aria-label="Link do afiliado"
            />
          </div>
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Comissão
        <div className="flex w-24 items-center gap-1">
          <TextInput
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            aria-label="Comissão em porcentagem"
          />
          <span className="text-fg-muted">%</span>
        </div>
      </label>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        isLoading={create.isPending}
      >
        Criar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Cancelar
      </Button>
    </form>
  );
}

/**
 * Afiliados: quem divulga, com que link e quanto recebe.
 *
 * A comissão mostrada é sobre cobrança já PAGA — antes de o dinheiro entrar
 * não há o que repassar. Mudar o percentual vale para indicações novas: cada
 * empresa guarda o percentual do dia em que chegou.
 */
export function AdminAffiliates() {
  const { data, isPending } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AffiliateRow[]> => {
      const res = await fetch("/api/admin/affiliates");
      if (!res.ok) throw new Error("forbidden");
      const json = (await res.json()) as { affiliates: AffiliateRow[] };
      return json.affiliates;
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Quem entra pelo link tem 90 dias para criar a conta. A comissão conta
          sobre cobrança paga.
        </p>
        <CreateAffiliate />
      </div>

      {isPending ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-fg-secondary">
          Nenhum afiliado ainda. Cadastre um para gerar o link de indicação.
        </p>
      ) : (
        <div className="border-line overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[length:var(--text-small-size)]">
            <thead className="text-fg-muted text-[length:var(--text-caption-size)]">
              <tr>
                <th className="px-3 py-2 font-medium">Afiliado</th>
                <th className="px-3 py-2 font-medium">Link</th>
                <th className="px-3 py-2 font-medium">Comissão</th>
                <th className="px-3 py-2 font-medium">Cliques</th>
                <th className="px-3 py-2 font-medium">Empresas</th>
                <th className="px-3 py-2 font-medium">A repassar</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.map((affiliate) => (
                <AffiliateRowItem key={affiliate.id} affiliate={affiliate} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
