"use client";

import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { applyBrand } from "@/lib/branding/apply";
import {
  BRAND_AVISOS,
  BRAND_THEMES,
  parseBrandTheme,
  type BrandTheme,
} from "@/lib/branding/themes";
import { useMembers, useCurrentUserId } from "@/lib/queries/useMembers";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * Escolha da cor da marca da empresa.
 *
 * **Aplica antes de salvar.** A cor muda no `<html>` no clique, e só então
 * vai para o banco. Escolher cor às cegas e descobrir o resultado depois de
 * um "salvar" é o jeito mais rápido de a pessoa desistir — ela precisa ver
 * a barra lateral, o botão e os chips mudarem para decidir.
 *
 * Se o banco recusar, volta ao que era. É o inverso da regra 6 (interface
 * otimista) aplicado ao contrário: aqui a interface é otimista de verdade,
 * porque o efeito é visual e reversível.
 */
export function BrandPicker() {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();

  const salvo = parseBrandTheme(workspace.brand_theme);
  const [escolhido, setEscolhido] = useState<BrandTheme>(salvo);

  const eu = members.find((m) => m.user_id === userId);
  const podeMexer = eu?.role === "owner" || eu?.role === "admin";

  const salvar = useMutation({
    mutationFn: async (tema: BrandTheme) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("workspace")
        .update({ brand_theme: tema })
        .eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show({ message: "Cor da marca atualizada" });
      void qc.invalidateQueries();
      // O workspace vem do layout no servidor; sem isto a página continuaria
      // com a cor antiga em memória até a próxima navegação completa.
      router.refresh();
    },
    onError: () => {
      setEscolhido(salvo);
      applyBrand(salvo);
      toast.show({ message: "Não foi possível salvar a cor" });
    },
  });

  function escolher(tema: BrandTheme) {
    setEscolhido(tema);
    applyBrand(tema);
    salvar.mutate(tema);
  }

  const aviso = BRAND_AVISOS[escolhido];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-fg font-medium">Cor da marca</h3>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {podeMexer
            ? "Vale para todo mundo da empresa"
            : "Só quem administra a empresa pode mudar"}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Cor da marca"
        className="flex flex-wrap gap-2"
      >
        {BRAND_THEMES.map((t) => {
          const ativo = t.id === escolhido;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={!podeMexer || salvar.isPending}
              onClick={() => escolher(t.id)}
              className={`border-line flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${
                ativo ? "border-line-strong bg-selected" : "hover:bg-hover"
              }`}
            >
              {/* O quadrado de cor é decoração: o nome ao lado é que informa,
                  e é o que faz a escolha funcionar para quem não distingue
                  as cores. O check confirma sem depender de cor nenhuma. */}
              <span
                aria-hidden
                style={{ background: t.swatch }}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
              >
                {ativo ? <IconCheck size={14} stroke={2.5} /> : null}
              </span>
              <span className="text-fg">{t.label}</span>
            </button>
          );
        })}
      </div>

      {aviso ? (
        <p
          role="status"
          className="text-fg-secondary text-[length:var(--text-caption-size)]"
        >
          {aviso}
        </p>
      ) : null}
    </section>
  );
}
