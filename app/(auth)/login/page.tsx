import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthFormPanel } from "@/components/auth/AuthFormPanel";

/**
 * Entrar.
 *
 * **A página é Server Component.** Só o `AuthForm` e as camadas de
 * atmosfera são `"use client"` — o painel institucional, a costura verde
 * e a casca saem prontos do servidor. Era o contrário antes: a rota
 * inteira era cliente porque o `useState` do formulário estava aqui.
 *
 * A proporção 56/44 vale do `lg` para cima. Entre `md` e `lg` (tablet e
 * notebook estreito) ela abre para 42/58 — o painel institucional cede
 * espaço porque o formulário é o que a pessoa veio fazer. Abaixo de `md`
 * os painéis empilham: faixa grafite no topo, formulário embaixo, e a
 * costura vira horizontal entre os dois.
 *
 * A porta principal continua sendo e-mail e senha; o link por e-mail
 * continua sendo a recuperação de quem esqueceu a senha, porque ainda não
 * há provedor de e-mail confiável e tirá-lo deixaria essa pessoa sem
 * caminho de volta.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[42fr_58fr] md:grid-rows-1 lg:grid-cols-[56fr_44fr]">
      <AuthBrandPanel />
      <AuthFormPanel>
        <AuthForm />
      </AuthFormPanel>
    </main>
  );
}
