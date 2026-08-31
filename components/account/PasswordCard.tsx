"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";

import { Campo } from "@/components/auth/Campo";
import {
  PasswordFields,
  passwordPairOk,
} from "@/components/auth/PasswordFields";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { useAccount } from "@/lib/queries/useAccount";
import { createClient } from "@/lib/supabase/client";

/**
 * Senha de acesso da própria pessoa.
 *
 * Quem entrou pelo Google não tem senha, e isso é um ponto único de falha
 * silencioso: perdeu o acesso à conta Google, perdeu o TAFLOW junto —
 * sem "esqueci minha senha" para recuperar, porque não há senha. Definir
 * uma aqui abre o segundo caminho, e os dois passam a valer.
 *
 * **Sobre não pedir a senha atual.** Numa conta só-Google não existe senha
 * atual para pedir. Quem protege a operação é a reautenticação por e-mail —
 * e ela é pedida pelo servidor, não decidida aqui: o fluxo tenta gravar
 * direto e, se o Supabase responder que precisa de reautenticação, mostra o
 * passo do código. Assim, ligar "Secure password change" no painel do
 * Supabase passa a valer sem mexer neste arquivo, e desligar também.
 */
function precisaReautenticar(mensagem: string): boolean {
  const m = mensagem.toLowerCase();
  return m.includes("reauthentication") || m.includes("nonce");
}

export function PasswordCard() {
  const { data: account, isLoading } = useAccount();
  const qc = useQueryClient();
  const toast = useToast();

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pedindoCodigo, setPedindoCodigo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading) return <Skeleton variant="block" className="h-48" />;

  const jaTem = account?.hasPassword ?? false;
  const pode = passwordPairOk(senha, confirmacao) && !enviando;

  function limpar() {
    setSenha("");
    setConfirmacao("");
    setCodigo("");
    setPedindoCodigo(false);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!pode) return;
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser(
      // O nonce só vai quando o servidor pediu — mandar um vazio faz o
      // Supabase recusar mesmo quando a reautenticação está desligada.
      pedindoCodigo
        ? { password: senha, nonce: codigo.trim() }
        : { password: senha }
    );

    if (error) {
      setEnviando(false);

      if (!pedindoCodigo && precisaReautenticar(error.message)) {
        const { error: reauthError } = await supabase.auth.reauthenticate();
        if (reauthError) {
          setErro(
            "Não foi possível enviar o código de confirmação. Tente de novo em instantes"
          );
          return;
        }
        setPedindoCodigo(true);
        setErro(null);
        return;
      }

      setErro(
        pedindoCodigo
          ? "Código inválido ou vencido. Peça outro e tente de novo"
          : "Não foi possível salvar a senha agora"
      );
      return;
    }

    setEnviando(false);
    limpar();
    // A conta passa a ter senha: o cartão precisa reler para trocar o texto.
    await qc.invalidateQueries({ queryKey: ["account"] });
    toast.show({
      message: jaTem ? "Senha alterada" : "Senha definida",
    });
  }

  return (
    <section className="border-line bg-card flex max-w-xl flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-fg font-medium">
          {jaTem ? "Alterar senha" : "Definir uma senha"}
        </h2>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {jaTem
            ? `Você entra com ${account?.email ?? "seu e-mail"} e senha${
                account?.hasGoogle ? ", ou pelo Google" : ""
              }`
            : `Hoje você entra só pelo Google. Com uma senha, ${
                account?.email ?? "seu e-mail"
              } também serve para entrar`}
        </p>
      </div>

      <form onSubmit={salvar} className="flex flex-col gap-4">
        <PasswordFields
          senha={senha}
          confirmacao={confirmacao}
          onSenha={setSenha}
          onConfirmacao={setConfirmacao}
          label={jaTem ? "Nova senha" : "Senha"}
        />

        {pedindoCodigo ? (
          <Campo label="Código enviado por e-mail">
            <TextInput
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Código de confirmação"
            />
            <span className="text-fg-muted text-[length:var(--text-caption-size)]">
              Enviamos um código para {account?.email}. Ele confirma que é você
              mesmo mudando a senha.
            </span>
          </Campo>
        ) : null}

        {erro ? (
          <p
            role="alert"
            className="text-overdue text-[length:var(--text-small-size)]"
          >
            {erro}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={enviando}
            disabled={!pode || (pedindoCodigo && codigo.trim().length < 6)}
          >
            {jaTem ? "Salvar nova senha" : "Definir senha"}
          </Button>
          {senha || pedindoCodigo ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={limpar}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
