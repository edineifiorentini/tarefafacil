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

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-[length:var(--text-h2-size)] font-medium text-fg">
        Entrar no TarefaFácil
      </h1>
      <p className="mb-8 text-fg-secondary">
        Use seu e-mail ou sua conta Google
      </p>

      {sent ? (
        <div
          role="status"
          className="rounded-md border border-line bg-selected p-[var(--space-card-pad)] text-fg"
        >
          <p className="font-medium">Link enviado</p>
          <p className="mt-1 text-[length:var(--text-small-size)] text-fg-secondary">
            Abra o link que enviamos para <strong>{email}</strong> para entrar.
          </p>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-[length:var(--text-small-size)] text-fg-secondary">
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
            className="rounded-sm border border-line bg-card px-3 py-2 text-fg placeholder:text-fg-muted"
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

      <div className="my-6 flex items-center gap-3 text-[length:var(--text-caption-size)] text-fg-muted">
        <span className="h-px flex-1 bg-[var(--border)]" />
        ou
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="inline-flex items-center justify-center gap-2 rounded-sm border border-line bg-card px-4 py-2 text-fg transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken"
      >
        <IconBrandGoogle size={18} stroke={1.5} />
        Continuar com Google
      </button>

      {error && (
        <p role="alert" className="mt-4 text-[length:var(--text-small-size)] text-overdue">
          {error}
        </p>
      )}
    </main>
  );
}
