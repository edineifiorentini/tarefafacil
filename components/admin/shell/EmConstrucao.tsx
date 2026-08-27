import { IconTool } from "@tabler/icons-react";

/**
 * Página da administração ainda não construída.
 *
 * Existe para o item do menu não levar a um 404. Diz o que vai morar ali e o
 * que falta para isso — em vez de mostrar números falsos, que é o que a
 * restrição 33 da especificação chama de "simular uma implementação
 * concluída".
 */
export function EmConstrucao({
  titulo,
  conteudo,
  bloqueio,
}: {
  titulo: string;
  /** O que esta tela vai mostrar quando existir. */
  conteudo: string[];
  /** O que precisa acontecer antes. */
  bloqueio: string;
}) {
  return (
    <section className="border-line bg-card flex flex-col gap-4 rounded-md border p-[var(--space-card-pad)]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-sunken text-fg-muted flex size-10 items-center justify-center rounded-full"
        >
          <IconTool size={20} stroke={1.5} />
        </span>
        <div>
          <h2 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            {titulo} ainda não foi construída
          </h2>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Nada aqui é número de exemplo — a tela entra quando tiver dado real.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          O que vai ficar aqui
        </p>
        <ul className="text-fg-secondary flex list-disc flex-col gap-1 pl-5 text-[length:var(--text-small-size)]">
          {conteudo.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          O que falta antes
        </p>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {bloqueio}
        </p>
      </div>
    </section>
  );
}
