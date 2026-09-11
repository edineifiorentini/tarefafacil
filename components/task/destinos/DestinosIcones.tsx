import { DESTINOS_POR_ID, ordenarDestinos } from "@/lib/tarefas/destinos";

import { IconeDoDestino } from "./IconeDoDestino";

/** Mais que isto e a fileira passa a disputar espaço com o nome. */
const LIMITE = 5;

/**
 * A fileira de logos abaixo do nome da demanda — na Hoje, na Lista e no
 * Quadro.
 *
 * **Sem destino, não desenha nada**, e a linha continua com uma linha só,
 * como sempre foi. Com mais de cinco, os primeiros aparecem e o resto vira
 * "+2".
 *
 * **Só `span`**, de propósito: a fileira mora dentro de botões (o cartão
 * do Quadro inteiro é um), e `div` dentro de `button` é HTML inválido.
 *
 * Para leitor de tela, a fileira é UMA imagem com nome — "Vai para:
 * Instagram, Facebook" —, e não cinco ícones anunciados um a um. Para quem
 * usa mouse, cada logo diz o nome da rede ao passar por cima.
 */
export function DestinosIcones({
  destinos,
  className = "",
}: {
  destinos: readonly string[] | null | undefined;
  className?: string;
}) {
  const ids = ordenarDestinos(destinos ?? []);
  if (ids.length === 0) return null;

  const nomes = ids.map((id) => DESTINOS_POR_ID[id].nome);
  const visiveis = ids.slice(0, LIMITE);
  const resto = ids.length - visiveis.length;

  return (
    <span
      role="img"
      aria-label={`Vai para: ${nomes.join(", ")}`}
      className={`text-fg-secondary flex items-center gap-1.5 ${className}`}
    >
      {visiveis.map((id) => (
        <span key={id} title={DESTINOS_POR_ID[id].nome} className="inline-flex">
          <IconeDoDestino id={id} />
        </span>
      ))}
      {resto > 0 ? (
        <span className="tnum text-fg-muted text-[length:var(--text-caption-size)]">
          +{resto}
        </span>
      ) : null}
    </span>
  );
}
