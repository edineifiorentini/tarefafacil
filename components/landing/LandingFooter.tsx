import Link from "next/link";

import { TaflowMark } from "@/components/branding/TaflowMark";
import { RODAPE, WHATSAPP_URL } from "@/lib/landing/conteudo";

/**
 * O rodapé.
 *
 * A marca aparece em negativo, que aqui significa a mesma geometria
 * oficial com a tinta trocada por token — não um segundo arquivo e
 * muito menos um redesenho. A proporção 855:245 vem do componente.
 *
 * **Link sem destino vira texto.** Três itens do Figma ("Sobre a
 * TAFLOW", "Central de ajuda" e, no fundo, qualquer página que ainda não
 * exista) não têm rota no projeto. Renderizar `<a href="#">` ali criaria
 * uma parada de teclado que não leva a lugar nenhum — pior que a
 * ausência. Eles ficam como texto até a página existir, e a lista está
 * na entrega.
 */
export function LandingFooter() {
  return (
    <footer className="bg-[var(--taflow-bg-inverse)]">
      <div
        className="mx-auto w-full px-6 sm:px-10 lg:px-16 xl:px-[var(--lp-gutter)]"
        style={{ maxWidth: "calc(var(--lp-content) + 2 * var(--lp-gutter))" }}
      >
        <span
          aria-hidden="true"
          className="block h-px bg-[rgba(255,255,255,0.12)]"
        />

        <div className="grid gap-10 py-14 lg:grid-cols-[minmax(0,350px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <TaflowMark
              title="TAFLOW"
              className="block"
              style={
                {
                  height: 40,
                  width: "auto",
                  ["--marca-tinta" as string]: "var(--taflow-text-inverse)",
                } as React.CSSProperties
              }
            />
            <p className="mt-6 max-w-[350px] text-[14px] leading-[22px] text-[var(--taflow-text-secondary-inverse)]">
              {RODAPE.descricao}
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-foco-inverse mt-7 inline-flex min-h-11 items-center text-[13px] font-medium text-[var(--taflow-text-inverse)]"
            >
              {RODAPE.whatsapp}
            </a>
          </div>

          <nav
            aria-label="Rodapé"
            className="grid grid-cols-2 gap-8 sm:grid-cols-4"
          >
            {RODAPE.colunas.map((coluna) => (
              <div key={coluna.titulo}>
                <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--taflow-bg-accent)]">
                  {coluna.titulo}
                </p>
                <ul className="mt-5 flex flex-col gap-1">
                  {coluna.links.map((link) => (
                    <li key={link.rotulo}>
                      {link.href === null ? (
                        // Sem rota: texto, não âncora morta.
                        <span className="inline-flex min-h-9 items-center text-[13px] leading-[20px] font-medium text-[rgba(139,152,144,0.6)]">
                          {link.rotulo}
                        </span>
                      ) : link.href.startsWith("http") ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lp-foco-inverse inline-flex min-h-9 items-center text-[13px] leading-[20px] font-medium text-[var(--taflow-text-secondary-inverse)] transition-colors [transition-duration:var(--dur-fast)] hover:text-[var(--taflow-text-inverse)]"
                        >
                          {link.rotulo}
                        </a>
                      ) : link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="lp-foco-inverse inline-flex min-h-9 items-center text-[13px] leading-[20px] font-medium text-[var(--taflow-text-secondary-inverse)] transition-colors [transition-duration:var(--dur-fast)] hover:text-[var(--taflow-text-inverse)]"
                        >
                          {link.rotulo}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="lp-foco-inverse inline-flex min-h-9 items-center text-[13px] leading-[20px] font-medium text-[var(--taflow-text-secondary-inverse)] transition-colors [transition-duration:var(--dur-fast)] hover:text-[var(--taflow-text-inverse)]"
                        >
                          {link.rotulo}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <span
          aria-hidden="true"
          className="block h-px bg-[rgba(255,255,255,0.1)]"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 py-7">
          <p className="text-[12px] leading-[18px] text-[var(--taflow-text-secondary-inverse)]">
            {RODAPE.copyright}
          </p>
          <p className="text-[12px] leading-[18px] font-medium text-[var(--taflow-text-inverse)]">
            {RODAPE.dominio}
          </p>
        </div>
      </div>
    </footer>
  );
}
