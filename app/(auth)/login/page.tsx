"use client";

import {
  IconBrandGoogle,
  IconEye,
  IconEyeOff,
  IconMailFast,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Entrar.
 *
 * A porta principal é e-mail e senha. O link por e-mail continua ali como
 * **recuperação**: hoje não há provedor de e-mail confiável, e tirar o link
 * deixaria quem esquece a senha sem nenhum caminho de volta.
 */
export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Traduz a falha do cadastro fechado.
   *
   * O trigger da 0061 recusa criar o usuário e o Supabase devolve "Database
   * error creating new user", que parece defeito do sistema. A troca só
   * acontece quando a porta está mesmo fechada — assim uma falha de verdade
   * continua aparecendo como falha.
   */
  async function mensagemDeErro(bruta: string): Promise<string> {
    if (/invalid login credentials/i.test(bruta)) {
      return "E-mail ou senha incorretos.";
    }
    if (/email not confirmed/i.test(bruta)) {
      return "Confirme seu e-mail antes de entrar. Procure o link que enviamos no cadastro.";
    }
    if (!/database error/i.test(bruta)) return bruta;
    try {
      const r = await fetch("/api/signups");
      const { open } = (await r.json()) as { open: boolean };
      if (!open) {
        return "Cadastros temporariamente fechados. Se você já tem conta, confira o e-mail digitado; se foi convidado, use o e-mail do convite.";
      }
    } catch {
      // Sem resposta da rota, fica a mensagem original.
    }
    return bruta;
  }

  // Destino pós-login (ex.: link de convite). Só aceita caminho interno.
  function callbackUrl() {
    const base = `${location.origin}/auth/callback`;
    const next = new URLSearchParams(location.search).get("next");
    return next && next.startsWith("/")
      ? `${base}?next=${encodeURIComponent(next)}`
      : base;
  }

  function destinoInterno(): string {
    const next = new URLSearchParams(location.search).get("next");
    return next && next.startsWith("/") ? next : "/hoje";
  }

  async function entrarComSenha(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setLoading(false);
    if (error) {
      setError(await mensagemDeErro(error.message));
      return;
    }
    router.push(destinoInterno());
    router.refresh();
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setLoading(false);
    if (error) setError(await mensagemDeErro(error.message));
    else setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-6 py-12">
      <h1 className="text-fg mb-1 text-[length:var(--text-h2-size)] font-medium">
        Entrar no TarefaFácil
      </h1>
      <p className="text-fg-secondary mb-8">
        {modo === "senha"
          ? "Use seu e-mail e senha, ou sua conta Google"
          : "Enviamos um link de acesso para o seu e-mail"}
      </p>

      {sent ? (
        <div
          role="status"
          className="border-line bg-selected text-fg rounded-md border p-[var(--space-card-pad)]"
        >
          <p className="font-medium">Link enviado</p>
          <p className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
            Abra o link que enviamos para <strong>{email}</strong> para entrar.
            Depois, você pode definir uma senha em Configurações.
          </p>
        </div>
      ) : (
        <form
          onSubmit={modo === "senha" ? entrarComSenha : sendMagicLink}
          className="flex flex-col gap-3"
        >
          <label
            htmlFor="email"
            className="text-fg-secondary text-[length:var(--text-small-size)]"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="border-line bg-card text-fg placeholder:text-fg-muted rounded-sm border px-3 py-2"
          />

          {modo === "senha" ? (
            <>
              <label
                htmlFor="senha"
                className="text-fg-secondary text-[length:var(--text-small-size)]"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={verSenha ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="border-line bg-card text-fg w-full rounded-sm border px-3 py-2 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
                  className="text-fg-muted hover:text-fg absolute top-1/2 right-2 -translate-y-1/2"
                >
                  {verSenha ? (
                    <IconEyeOff size={18} stroke={1.75} />
                  ) : (
                    <IconEye size={18} stroke={1.75} />
                  )}
                </button>
              </div>
            </>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--button-primary-bg)] px-4 py-2 text-[var(--button-primary-fg)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-60"
          >
            {modo === "link" ? <IconMailFast size={18} stroke={1.5} /> : null}
            {loading
              ? "Entrando…"
              : modo === "senha"
                ? "Entrar"
                : "Enviar link de acesso"}
          </button>

          {/* Recuperação: sem provedor de e-mail confiável, o link é o
              caminho de volta de quem esqueceu a senha. */}
          <button
            type="button"
            onClick={() => {
              setModo((m) => (m === "senha" ? "link" : "senha"));
              setError(null);
            }}
            className="text-fg-secondary hover:text-fg text-[length:var(--text-caption-size)] underline"
          >
            {modo === "senha"
              ? "Esqueci minha senha — entrar por link no e-mail"
              : "Voltar para entrar com senha"}
          </button>
        </form>
      )}

      <div className="text-fg-secondary my-6 flex items-center gap-3 text-[length:var(--text-caption-size)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        ou
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="border-line bg-card text-fg hover:bg-hover inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-2 transition-colors [transition-duration:var(--dur-fast)]"
      >
        <IconBrandGoogle size={18} stroke={1.5} />
        Continuar com Google
      </button>

      {error && (
        <p
          role="alert"
          className="text-overdue mt-4 text-[length:var(--text-small-size)]"
        >
          {error}
        </p>
      )}

      <p className="text-fg-secondary mt-8 text-center text-[length:var(--text-small-size)]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-fg-link underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
