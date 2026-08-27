"use client";

import { useEffect } from "react";

import { applyBrand, currentBrand } from "@/lib/branding/apply";
import { type BrandTheme } from "@/lib/branding/themes";

/**
 * Alinha o cookie da cor com o que o banco diz.
 *
 * O `<html>` é pintado a partir do cookie, que é rápido mas pode estar
 * desatualizado em três situações: primeiro acesso, quem troca de empresa no
 * seletor, e quem entra num workspace onde outra pessoa mudou a cor.
 *
 * Em regime normal não faz nada — cookie e banco já batem, e o `if` sai fora
 * antes de tocar no DOM. Quando diverge, corrige na hora e grava o cookie
 * para a próxima navegação já vir certa do servidor.
 *
 * O cookie não é `httpOnly` de propósito: é preferência de aparência, não
 * segredo, e escrever daqui evita uma rota só para isso.
 */
export function BrandSync({ theme }: { theme: BrandTheme }) {
  useEffect(() => {
    if (currentBrand() === theme) return;
    applyBrand(theme);
  }, [theme]);

  return null;
}
