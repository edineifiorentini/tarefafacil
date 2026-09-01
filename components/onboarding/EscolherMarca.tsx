"use client";

import { useState } from "react";

import { IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { TaflowMark } from "@/components/branding/TaflowMark";
import { Button } from "@/components/ui/Button";
import { applyBrand } from "@/lib/branding/apply";
import {
  BRAND_AVISOS,
  BRAND_DEFAULT,
  BRAND_THEMES,
  parseBrandTheme,
  type BrandTheme,
} from "@/lib/branding/themes";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * A escolha da cor no primeiro acesso (0084).
 *
 * **Aparece uma vez e não volta.** Quem decide isso é
 * `workspace.brand_escolhida_em`, e não o valor da cor: sem a coluna,
 * "ainda está no padrão" e "escolheu o padrão de propósito" seriam
 * indistinguíveis, e a tela perguntaria de novo a quem já respondeu.
 *
 * **Pular também grava o carimbo.** É o que faz "não quero decidir agora"
 * ser uma resposta, e não um adiamento que reaparece amanhã.
 *
 * A cor é aplicada no `<html>` a cada clique, antes de salvar. Escolher cor
 * às cegas e descobrir o resultado depois de um "salvar" é o jeito mais
 * rápido de a pessoa desistir — ela precisa ver a barra e os chips mudarem.
 */
export function EscolherMarca() {
  const workspace = useWorkspace();
  const router = useRouter();

  const [escolhido, setEscolhido] = useState<BrandTheme>(
    parseBrandTheme(workspace.brand_theme)
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function escolher(tema: BrandTheme) {
    setEscolhido(tema);
    applyBrand(tema);
  }

  async function concluir(tema: BrandTheme) {
    setSalvando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("workspace")
      .update({
        brand_theme: tema,
        // O carimbo vai JUNTO da cor, na mesma escrita. Em duas escritas,
        // uma falha deixaria a empresa com a cor nova e a tela voltando.
        brand_escolhida_em: new Date().toISOString(),
      })
      .eq("id", workspace.id);

    if (error) {
      setSalvando(false);
      setErro("Não foi possível salvar. Tente de novo");
      return;
    }

    // A empresa vem de Server Component: sem isto a casca continuaria com o
    // estado antigo até uma navegação completa.
    router.refresh();
  }

  const aviso = BRAND_AVISOS[escolhido];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--max-width-read)] flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <TaflowMark title="" className="block h-10 w-auto" />
        <div className="flex flex-col gap-2">
          <h1 className="text-fg text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold">
            Escolha a cor da sua empresa
          </h1>
          <p className="text-fg-secondary">
            Ela vale no sistema inteiro, nos modos claro e escuro. Dá para
            trocar depois em Configurações.
          </p>
        </div>
      </div>

      {/* Grade de quatro e não `flex-wrap`: são oito opções, e com quebra
          livre elas caíam 7 + 1, deixando a última órfã numa linha só. Duas
          fileiras de quatro leem como escolha organizada; sete e uma lê como
          erro de layout. */}
      <div
        role="radiogroup"
        aria-label="Cor da empresa"
        className="mx-auto grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {BRAND_THEMES.map((t) => {
          const ativo = t.id === escolhido;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={salvando}
              onClick={() => escolher(t.id)}
              className={`border-line flex flex-col items-center gap-2 rounded-md border p-4 transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${
                ativo ? "border-line-strong bg-selected" : "hover:bg-hover"
              }`}
            >
              {/* O quadrado é decoração: o nome abaixo é que informa, e o
                  check confirma sem depender de enxergar cor. */}
              <span
                aria-hidden
                style={{ background: t.swatch }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
              >
                {ativo ? <IconCheck size={18} stroke={2.5} /> : null}
              </span>
              <span className="text-fg text-[length:var(--text-small-size)]">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {aviso ? (
        <p
          role="status"
          className="text-fg-secondary text-center text-[length:var(--text-small-size)]"
        >
          {aviso}
        </p>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="text-center text-[length:var(--text-small-size)] text-[var(--negative)]"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        <Button
          variant="primary"
          isLoading={salvando}
          onClick={() => void concluir(escolhido)}
        >
          Usar esta cor
        </Button>
        {/* Pular grava o padrão E o carimbo: é resposta, não adiamento. */}
        <Button
          variant="ghost"
          disabled={salvando}
          onClick={() => void concluir(BRAND_DEFAULT)}
        >
          Decidir depois
        </Button>
      </div>
    </div>
  );
}
