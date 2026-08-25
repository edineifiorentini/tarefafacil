"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { Campo } from "@/components/auth/Campo";
import { PasswordFields } from "@/components/auth/PasswordFields";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DocumentInput } from "@/components/ui/DocumentInput";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { completeSignup } from "@/lib/auth/completeSignup";
import { TERMS_LABEL } from "@/lib/auth/terms";
import { createClient } from "@/lib/supabase/client";
import { documentLabel, isValidDocument } from "@/lib/validation/document";
import { passwordIssues } from "@/lib/validation/password";

const TIPOS = [
  { value: "pf", label: "Pessoa física" },
  { value: "pj", label: "Empresa" },
];

/**
 * Cadastro com senha.
 *
 * Funciona nos DOIS modos de confirmação de e-mail do Supabase, e a
 * diferença é visível para quem se cadastra:
 *
 * - confirmação desligada: vem sessão na hora, o perfil é gravado no mesmo
 *   segundo e a pessoa cai na escolha de plano;
 * - confirmação ligada: não vem sessão, e a tela diz para confirmar o
 *   e-mail. Os dados do formulário viajam como metadados do usuário e são
 *   aplicados no primeiro login pela tela de completar cadastro.
 *
 * Sem isso, mudar o interruptor no painel do Supabase quebraria o cadastro
 * de um jeito silencioso.
 */
export function SignupForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<"pf" | "pj">("pf");
  const [documento, setDocumento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceite, setAceite] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmeEmail, setConfirmeEmail] = useState(false);

  const faltas = passwordIssues(senha);
  const documentoOk = !documento || isValidDocument(documento, tipo);

  const pode =
    nome.trim().length > 2 &&
    email.includes("@") &&
    isValidDocument(documento, tipo) &&
    faltas.length === 0 &&
    senha === confirmacao &&
    aceite;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pode || enviando) return;
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        // Viajam com o usuário até o primeiro login, para o caso de a
        // confirmação de e-mail adiar a sessão.
        data: {
          full_name: nome.trim(),
          document_type: tipo,
          document: documento,
          accepted_terms: true,
        },
      },
    });

    if (error) {
      setEnviando(false);
      setErro(await mensagemDeErro(error.message));
      return;
    }

    if (!data.session) {
      // Confirmação de e-mail ligada: não há sessão para gravar o perfil.
      setEnviando(false);
      setConfirmeEmail(true);
      return;
    }

    try {
      await completeSignup({
        fullName: nome.trim(),
        documentType: tipo,
        document: documento,
        acceptedTerms: true,
      });
    } catch {
      // O cadastro existe; o perfil pode ser completado depois. Melhor
      // entrar do que travar quem acabou de se cadastrar.
    }
    router.push("/planos");
    router.refresh();
  }

  if (confirmeEmail) {
    return (
      <div
        role="status"
        className="border-line bg-selected text-fg rounded-md border p-[var(--space-card-pad)]"
      >
        <p className="font-medium">Confirme seu e-mail para entrar</p>
        <p className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
          Enviamos um link para {email}. Depois de confirmar, você entra com a
          senha que acabou de criar e completa o cadastro.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo label="Nome completo">
        <TextInput
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          placeholder="Como você assina"
          aria-label="Nome completo"
        />
      </Campo>

      <Campo label="E-mail de acesso">
        <TextInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="voce@empresa.com"
          aria-label="E-mail de acesso"
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Tipo de cadastro">
          <Select
            options={TIPOS}
            value={tipo}
            onValueChange={(v) => {
              setTipo(v as "pf" | "pj");
              setDocumento("");
            }}
            aria-label="Tipo de cadastro"
          />
        </Campo>
        <Campo
          label={documentoLabelCurto(tipo)}
          erro={
            documentoOk ? undefined : `${documentoLabelCurto(tipo)} inválido`
          }
        >
          <DocumentInput
            value={documento}
            onChange={setDocumento}
            type={tipo}
            aria-label={documentLabel(tipo)}
          />
        </Campo>
      </div>

      <PasswordFields
        senha={senha}
        confirmacao={confirmacao}
        onSenha={setSenha}
        onConfirmacao={setConfirmacao}
      />

      <label className="text-fg-secondary flex items-start gap-2 text-[length:var(--text-small-size)]">
        <Checkbox
          checked={aceite}
          onCheckedChange={(c) => setAceite(c === true)}
          aria-label="Aceito os termos de uso"
          className="mt-0.5"
        />
        <span>
          Li e aceito os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="text-fg-link underline"
          >
            {TERMS_LABEL}
          </Link>
        </span>
      </label>

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-small-size)]"
        >
          {erro}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        disabled={!pode}
        isLoading={enviando}
      >
        Criar conta
      </Button>

      <p className="text-fg-secondary text-center text-[length:var(--text-small-size)]">
        Já tem conta?{" "}
        <Link href="/login" className="text-fg-link underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function documentoLabelCurto(tipo: "pf" | "pj"): string {
  return tipo === "pf" ? "CPF" : "CNPJ";
}

/**
 * Traduz a recusa do cadastro fechado (0061).
 *
 * O Supabase engole o texto do trigger e devolve "Database error saving new
 * user", que parece defeito. Só troca a mensagem quando a porta está mesmo
 * fechada — falha de verdade continua aparecendo como falha.
 */
async function mensagemDeErro(bruta: string): Promise<string> {
  if (/database error/i.test(bruta)) {
    try {
      const r = await fetch("/api/signups");
      const { open } = (await r.json()) as { open: boolean };
      if (!open) {
        return "Cadastros temporariamente fechados. Se você foi convidado, use o e-mail do convite.";
      }
    } catch {
      // Sem resposta da rota, fica a mensagem original.
    }
  }
  if (/already registered|already exists/i.test(bruta)) {
    return "Já existe conta com esse e-mail. Entre pela tela de login.";
  }
  return bruta;
}
