import Link from "next/link";

import { SignupForm } from "@/components/auth/SignupForm";

export default function CadastroPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-12">
      <h1 className="text-fg mb-1 text-[length:var(--text-h2-size)] font-medium">
        Criar conta no TAFLOW
      </h1>
      <p className="text-fg-secondary mb-8">
        Sete dias de teste, sem cartão. Você escolhe o plano depois.
      </p>

      <SignupForm />

      <p className="text-fg-muted mt-6 text-center text-[length:var(--text-caption-size)]">
        Prefere entrar com o Google?{" "}
        <Link href="/login" className="underline">
          Use a tela de login
        </Link>
      </p>
    </main>
  );
}
