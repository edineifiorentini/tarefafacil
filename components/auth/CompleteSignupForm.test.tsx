import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuthLayout from "@/app/(auth)/layout";

import { CompleteSignupForm } from "./CompleteSignupForm";

/**
 * A tela de completar cadastro montada como a rota a monta.
 *
 * Em 2/set/2026 ela devolvia 500 em produção: `app/(auth)` não tinha
 * layout, `Providers` só existia em `app/(app)/layout.tsx`, e o
 * `useToast()` deste formulário lança quando não há `ToastProvider`. Quem
 * entrava pelo Google via a página falhar e não tinha saída — o porteiro
 * de `(app)` manda para cá enquanto `onboarding_completed_at` for nulo.
 *
 * Por isso o teste envolve o formulário no LAYOUT de verdade em vez de nos
 * providers direto: assim ele quebra se alguém apagar `(auth)/layout.tsx`,
 * que é a peça que faltava.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("CompleteSignupForm na rota (auth)", () => {
  it("renderiza dentro do layout de (auth)", () => {
    render(
      <AuthLayout>
        <CompleteSignupForm
          defaultName="Maria"
          defaultType="pf"
          defaultDocument=""
        />
      </AuthLayout>
    );

    expect(screen.getByLabelText("Nome completo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Concluir cadastro" })).toBeTruthy();
  });
});
