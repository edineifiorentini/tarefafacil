"use client";

import { IconBrandGoogle, IconMailFast } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { createClient } from "@/lib/supabase/client";

import { AuthField } from "./AuthField";
import { AuthPrimaryButton } from "./AuthPrimaryButton";
import { PasswordField } from "./PasswordField";
import { SocialLoginButton } from "./SocialLoginButton";

/**
 * O formulário de entrar.
 *
 * **Nada de autenticação mudou nesta reforma.** As três chamadas são as
 * mesmas de antes — `signInWithPassword`, `signInWithOtp`,
 * `signInWithOAuth` —, o `callbackUrl()` continua saindo de
 * `location.origin` (é o que faz o retorno funcionar em qualquer domínio)
 * e a tradução da falha de cadastro fechado continua inteira. O que mudou
 * foi a casca em volta.
 *
 * O componente é o ÚNICO da tela que fala com o Supabase. O fundo, a
 * costura e os fragmentos não sabem que existe login; este arquivo não
 * sabe que existe canvas.
 */

/**
 * Chave do e-mail lembrado. Prefixo `tf-` como o resto do que guardamos.
 *
 * **O que "Lembrar de mim" faz aqui, dito sem rodeio:** guarda o E-MAIL
 * para a próxima visita. NÃO mexe em quanto tempo a sessão dura — isso
 * mora nos cookies do Supabase, e mexer neles seria mexer em criação de
 * sessão, que esta reforma não podia tocar. É o que a maioria dos
 * produtos faz atrás desse rótulo, e é útil de verdade; mas se a
 * intenção era controlar a duração da sessão, isto aqui não é isso.
 */
const CHAVE_EMAIL = "tf-login-email";

/** O valor guardado não muda no meio da sessão: não há o que assinar. */
function assinarNada() {
  return () => {};
}

function lerEmailGuardado(): string {
  try {
    return localStorage.getItem(CHAVE_EMAIL) ?? "";
  } catch {
    // Navegador com armazenamento bloqueado. Segue sem lembrar.
    return "";
  }
}

/** No servidor não há localStorage; o campo nasce vazio e a hidratação
 *  corrige. `useSyncExternalStore` existe exatamente para este caso —
 *  ler em `useEffect` e chamar `setState` provocaria render em cascata. */
function lerNoServidor(): string {
  return "";
}

export function AuthForm() {
  const router = useRouter();
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [senha, setSenha] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  const emailLembrado = useSyncExternalStore(
    assinarNada,
    lerEmailGuardado,
    lerNoServidor
  );

  // `null` = a pessoa ainda não mexeu, então vale o que estava guardado.
  // Valor derivado em vez de estado sincronizado por efeito.
  const [emailDigitado, setEmailDigitado] = useState<string | null>(null);
  const email = emailDigitado ?? emailLembrado;

  const [lembrarMarcado, setLembrarMarcado] = useState<boolean | null>(null);
  // Quem já foi lembrado antes vê a caixa marcada; quem chega pela
  // primeira vez, não. A escolha anterior é a informação, não um padrão.
  const lembrar = lembrarMarcado ?? emailLembrado !== "";

  const setEmail = setEmailDigitado;

  /**
   * Traduz a falha do cadastro fechado.
   *
   * O trigger da 0061 recusa criar o usuário e o Supabase devolve
   * "Database error creating new user", que parece defeito do sistema. A
   * troca só acontece quando a porta está mesmo fechada — assim uma falha
   * de verdade continua aparecendo como falha.
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

  function guardarEmail(valor: string) {
    try {
      if (lembrar) localStorage.setItem(CHAVE_EMAIL, valor);
      else localStorage.removeItem(CHAVE_EMAIL);
    } catch {
      // Sem armazenamento, nada a fazer — não é motivo para falhar o login.
    }
  }

  /** Validação nossa, para a mensagem ficar no lugar certo e ser lida
   *  pelo leitor de tela. O `noValidate` no form desliga a bolha nativa. */
  function valido(): boolean {
    let ok = true;
    const e = email.trim();
    if (!e) {
      setErroEmail("Informe seu e-mail");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setErroEmail("E-mail inválido");
      ok = false;
    } else {
      setErroEmail(null);
    }

    if (modo === "senha") {
      if (!senha) {
        setErroSenha("Informe sua senha");
        ok = false;
      } else {
        setErroSenha(null);
      }
    }
    return ok;
  }

  async function entrarComSenha() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) {
      setCarregando(false);
      setErro(await mensagemDeErro(error.message));
      return;
    }
    guardarEmail(email.trim());
    // Segue "carregando" até a navegação acontecer: soltar o botão aqui
    // deixaria uma janela em que dá para clicar de novo.
    setIndo(true);
    router.push(destinoInterno());
    router.refresh();
  }

  async function enviarLink() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setCarregando(false);
    if (error) setErro(await mensagemDeErro(error.message));
    else {
      guardarEmail(email.trim());
      setEnviado(true);
    }
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (carregando || indo) return; // trava do envio duplo
    setErro(null);
    if (!valido()) return;
    setCarregando(true);
    if (modo === "senha") await entrarComSenha();
    else await enviarLink();
  }

  async function entrarComGoogle() {
    setErro(null);
    setCarregandoGoogle(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // Sem erro, o navegador já está saindo para o Google — soltar o
    // estado aqui faria o botão "piscar" de volta antes de sair.
    if (error) {
      setCarregandoGoogle(false);
      setErro(error.message);
    }
  }

  if (enviado) {
    return (
      <div
        role="status"
        className="tf-auth-enter rounded-md border p-[var(--space-card-pad)]"
        style={{
          borderColor: "var(--auth-field-border)",
          backgroundColor: "var(--auth-field-bg)",
        }}
      >
        <p
          className="font-medium"
          style={{ color: "var(--auth-panel-fg)" }}
        >
          Link enviado
        </p>
        <p
          className="mt-1 text-[length:var(--text-small-size)]"
          style={{ color: "var(--auth-panel-fg-secondary)" }}
        >
          Abra o link que enviamos para <strong>{email}</strong> para entrar.
          Depois, você pode definir uma senha em Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="tf-auth-enter">
      <h1
        className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-[weight:var(--font-weight-semibold)] tracking-[-0.01em]"
        style={{ color: "var(--auth-panel-fg)" }}
      >
        Bem-vindo de volta
      </h1>
      <p
        className="mt-1.5 text-[length:var(--text-small-size)]"
        style={{ color: "var(--auth-panel-fg-secondary)" }}
      >
        {modo === "senha"
          ? "Entre para continuar no seu fluxo."
          : "Enviamos um link de acesso para o seu e-mail."}
      </p>

      <form onSubmit={aoEnviar} noValidate className="mt-7 flex flex-col gap-4">
        <AuthField
          id="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="voce@exemplo.com"
          value={email}
          erro={erroEmail}
          disabled={carregando || indo}
          onChange={(e) => {
            setEmail(e.target.value);
            if (erroEmail) setErroEmail(null);
          }}
        />

        {modo === "senha" ? (
          <PasswordField
            id="senha"
            label="Senha"
            autoComplete="current-password"
            value={senha}
            erro={erroSenha}
            disabled={carregando || indo}
            onChange={(e) => {
              setSenha(e.target.value);
              if (erroSenha) setErroSenha(null);
            }}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 text-[length:var(--text-small-size)]"
            style={{ color: "var(--auth-panel-fg-secondary)" }}
          >
            <Checkbox
              checked={lembrar}
              onCheckedChange={(c) => setLembrarMarcado(c === true)}
              aria-label="Lembrar de mim"
            />
            Lembrar de mim
          </label>

          {/* Continua sendo o mesmo caminho de sempre: sem provedor de
              e-mail confiável, o link é a recuperação de quem esqueceu a
              senha. Só mudou de lugar e de aparência. */}
          <button
            type="button"
            onClick={() => {
              setModo((m) => (m === "senha" ? "link" : "senha"));
              setErro(null);
              setErroSenha(null);
            }}
            className="inline-flex min-h-11 items-center rounded-xs text-[length:var(--text-small-size)] underline underline-offset-2 transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--auth-focus-ring)]"
            style={{ color: "var(--auth-panel-fg-secondary)" }}
          >
            {modo === "senha"
              ? "Esqueci minha senha"
              : "Entrar com senha"}
          </button>
        </div>

        <AuthPrimaryButton
          carregando={carregando || indo}
          rotuloCarregando={modo === "senha" ? "Entrando…" : "Enviando…"}
        >
          {modo === "link" ? (
            <IconMailFast size={18} stroke={1.5} aria-hidden="true" />
          ) : null}
          {modo === "senha" ? "Entrar" : "Enviar link de acesso"}
        </AuthPrimaryButton>
      </form>

      <div
        className="my-6 flex items-center gap-3 text-[length:var(--text-caption-size)]"
        style={{ color: "var(--auth-panel-fg-secondary)" }}
      >
        <span
          className="h-px flex-1"
          style={{ backgroundColor: "var(--auth-field-border)" }}
        />
        ou continue com
        <span
          className="h-px flex-1"
          style={{ backgroundColor: "var(--auth-field-border)" }}
        />
      </div>

      <SocialLoginButton
        onClick={entrarComGoogle}
        carregando={carregandoGoogle}
        disabled={carregando || indo}
        icone={<IconBrandGoogle size={18} stroke={1.75} aria-hidden="true" />}
      >
        Continuar com Google
      </SocialLoginButton>

      {/* Região viva: o erro geral é anunciado quando aparece, sem roubar
          o foco de quem está digitando. */}
      <div aria-live="polite" role="alert">
        {erro ? (
          <p
            className="mt-4 text-[length:var(--text-small-size)] [animation:tf-fade-in_var(--dur-fast)_var(--ease-out)]"
            style={{ color: "var(--auth-negative)" }}
          >
            {erro}
          </p>
        ) : null}
      </div>

      <p
        className="mt-8 text-center text-[length:var(--text-small-size)]"
        style={{ color: "var(--auth-panel-fg-secondary)" }}
      >
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="rounded-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--auth-focus-ring)]"
          style={{ color: "var(--auth-panel-fg)" }}
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
