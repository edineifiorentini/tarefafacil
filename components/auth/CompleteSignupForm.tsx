"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DocumentInput } from "@/components/ui/DocumentInput";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { completeSignup } from "@/lib/auth/completeSignup";
import { TERMS_LABEL } from "@/lib/auth/terms";
import { documentLabel, isValidDocument } from "@/lib/validation/document";

const TIPOS = [
  { value: "pf", label: "Pessoa física" },
  { value: "pj", label: "Empresa" },
];

/**
 * Os mesmos dados do cadastro, pedidos depois de entrar.
 *
 * Serve a dois caminhos: quem entrou pelo Google (nunca passou pelo
 * formulário) e quem se cadastrou com senha enquanto a confirmação de
 * e-mail estava ligada — nesse caso os valores já vêm preenchidos a partir
 * do que a pessoa digitou, e ela só confirma.
 */
export function CompleteSignupForm({
  defaultName,
  defaultType,
  defaultDocument,
}: {
  defaultName: string;
  defaultType: "pf" | "pj";
  defaultDocument: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [nome, setNome] = useState(defaultName);
  const [tipo, setTipo] = useState<"pf" | "pj">(defaultType);
  const [documento, setDocumento] = useState(defaultDocument);
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const documentoOk = !documento || isValidDocument(documento, tipo);
  const pode =
    nome.trim().length > 2 && isValidDocument(documento, tipo) && aceite;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pode || enviando) return;
    setEnviando(true);
    try {
      await completeSignup({
        fullName: nome.trim(),
        documentType: tipo,
        document: documento,
        acceptedTerms: true,
      });
      router.push("/planos");
      router.refresh();
    } catch {
      setEnviando(false);
      toast.show({ message: "Não foi possível salvar. Tente de novo." });
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Nome completo
        </span>
        <TextInput
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          aria-label="Nome completo"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Tipo de cadastro
          </span>
          <Select
            options={TIPOS}
            value={tipo}
            onValueChange={(v) => {
              setTipo(v as "pf" | "pj");
              setDocumento("");
            }}
            aria-label="Tipo de cadastro"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            {tipo === "pf" ? "CPF" : "CNPJ"}
          </span>
          <DocumentInput
            value={documento}
            onChange={setDocumento}
            type={tipo}
            aria-label={documentLabel(tipo)}
          />
          {!documentoOk ? (
            <span className="text-overdue text-[length:var(--text-caption-size)]">
              {tipo === "pf" ? "CPF" : "CNPJ"} inválido
            </span>
          ) : null}
        </label>
      </div>

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

      <Button
        type="submit"
        variant="primary"
        disabled={!pode}
        isLoading={enviando}
      >
        Concluir cadastro
      </Button>
    </form>
  );
}
