import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

/**
 * As telas de porta de entrada também precisam dos providers.
 *
 * Elas ficam fora de `(app)` de propósito — quem ainda não entrou não pode
 * ver a barra lateral. Só que `(app)/layout.tsx` era o ÚNICO lugar que
 * montava `Providers`, e sem ele qualquer componente que chame `useToast`
 * ou `useQuery` lança na hora do render.
 *
 * Foi exatamente o que derrubou `/completar-cadastro` em produção
 * (2/set/2026): `CompleteSignupForm` usa `useToast()`, o erro subia no
 * render do servidor e a rota devolvia 500. Quem entrava pelo Google via a
 * página falhar e não tinha saída, porque o porteiro de `(app)` manda para
 * cá enquanto `onboarding_completed_at` for nulo — o laço só terminava
 * numa tela quebrada.
 *
 * Montar aqui, e não remover o toast do formulário, é o conserto que vale
 * para a próxima tela também: o custo é um QueryClient ocioso em três
 * páginas.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
