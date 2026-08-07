import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto max-w-[var(--max-width-read)] px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[length:var(--text-h1-size)] font-medium leading-[var(--text-h1-line)] text-fg">
            TarefaFácil
          </h1>
          <p className="text-fg-secondary">Fundação de design — E01</p>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-8 rounded-md border border-line bg-card p-[var(--space-card-pad)]">
        <h2 className="mb-3 text-[length:var(--text-h3-size)] font-medium text-fg">
          Cores e estados
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-sm bg-[var(--button-primary-bg)] px-4 py-2 text-[var(--button-primary-fg)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-[var(--button-primary-bg-hover)]"
          >
            Ação primária
          </button>
          <a href="#" className="text-fg-link underline">
            Link
          </a>
          <span className="rounded-full bg-overdue-bg px-3 py-1 text-[length:var(--text-small-size)] text-overdue">
            Atrasado
          </span>
          <span className="rounded-full bg-due-soon-bg px-3 py-1 text-[length:var(--text-small-size)] text-due-soon">
            Prazo próximo
          </span>
          <span className="text-[length:var(--text-small-size)] text-done line-through">
            Concluído
          </span>
        </div>
      </section>

      <section className="rounded-md border border-line bg-card p-[var(--space-card-pad)]">
        <h2 className="mb-3 text-[length:var(--text-h3-size)] font-medium text-fg">
          Números tabulares
        </h2>
        <p className="tnum text-fg-secondary">
          01/09 · 10/09 · 11/09 — colunas alinhadas com .tnum
        </p>
      </section>

      <p className="mt-8 text-[length:var(--text-small-size)] text-fg-muted">
        Paleta completa e razões de contraste na story “Fundação/Tokens” do
        Storybook.
      </p>
    </main>
  );
}
