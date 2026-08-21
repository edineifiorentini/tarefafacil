"use client";

import { IconBrandGoogle, IconMailFast } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
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
        Use seu e-mail ou sua conta Google
      </p>

      {sent ? (
        <div
          role="status"
          className="border-line bg-selected text-fg rounded-md border p-[var(--space-card-pad)]"
        >
          <p className="font-medium">Link enviado</p>
          <p className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
            Abra o link que enviamos para <strong>{email}</strong> para entrar.
          </p>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
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
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--button-primary-bg)] px-4 py-2 text-[var(--button-primary-fg)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-60"
          >
            <IconMailFast size={18} stroke={1.5} />
            {loading ? "Enviando…" : "Enviar link de acesso"}
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
    </main>
  );
}
