import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { contrastRatio, formatRatio } from "@/lib/utils/contrast";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// "rgb(28, 28, 26)" -> "#1c1c1a" (ignora alpha; só medimos combinações sólidas)
function toHex(rgb: string): string {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#000000";
  const h = (n: string) => Math.round(Number(n)).toString(16).padStart(2, "0");
  return `#${h(m[0])}${h(m[1])}${h(m[2])}`;
}

const brandRamp = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;

type Combo = { label: string; fg: string; bg: string; min: number };

// Combinações de TEXTO sobre fundo sólido (as críticas para acessibilidade).
const textCombos: Combo[] = [
  {
    label: "Texto primário / página",
    fg: "--text-primary",
    bg: "--surface-page",
    min: 4.5,
  },
  {
    label: "Texto primário / card",
    fg: "--text-primary",
    bg: "--surface-card",
    min: 4.5,
  },
  {
    label: "Texto secundário / página",
    fg: "--text-secondary",
    bg: "--surface-page",
    min: 4.5,
  },
  {
    label: "Texto muted / página (≥18px)",
    fg: "--text-muted",
    bg: "--surface-page",
    min: 3,
  },
  { label: "Link / página", fg: "--text-link", bg: "--surface-page", min: 4.5 },
  {
    label: "Branco / botão primário",
    fg: "--button-primary-fg",
    bg: "--button-primary-bg",
    min: 4.5,
  },
  {
    label: "Atrasado / página",
    fg: "--status-overdue-fg",
    bg: "--surface-page",
    min: 4.5,
  },
  {
    label: "Prazo próximo / página",
    fg: "--status-due-soon-fg",
    bg: "--surface-page",
    min: 4.5,
  },
  {
    label: "Concluído / página (≥18px)",
    fg: "--status-done-fg",
    bg: "--surface-page",
    min: 3,
  },
];

const sectors = ["violeta", "azul", "coral", "rosa", "grafite"] as const;

const typeScale = [
  {
    token: "text-h1",
    size: "--text-h1-size",
    line: "--text-h1-line",
    weight: 500,
    sample: "Título de projeto",
  },
  {
    token: "text-h2",
    size: "--text-h2-size",
    line: "--text-h2-line",
    weight: 500,
    sample: "Título de página",
  },
  {
    token: "text-h3",
    size: "--text-h3-size",
    line: "--text-h3-line",
    weight: 500,
    sample: "Título de card",
  },
  {
    token: "text-body",
    size: "--text-body-size",
    line: "--text-body-line",
    weight: 400,
    sample: "Corpo — título de tarefa",
  },
  {
    token: "text-small",
    size: "--text-small-size",
    line: "--text-small-line",
    weight: 400,
    sample: "Texto secundário e labels",
  },
  {
    token: "text-caption",
    size: "--text-caption-size",
    line: "--text-caption-line",
    weight: 400,
    sample: "Metadados e contadores",
  },
] as const;

const spacing = [
  "--space-card-gap",
  "--space-card-pad",
  "--space-panel-pad",
  "--space-section-gap",
  "--space-row",
] as const;

/* ------------------------------------------------------------------ */
/* Componentes de exibição                                            */
/* ------------------------------------------------------------------ */

function ContrastRow({ label, fg, bg, min }: Combo) {
  const [ratio, setRatio] = useState<number | null>(null);

  // Mede via ref callback (roda no commit, não no render): lê as cores já
  // resolvidas do tema e calcula a razão real, sem setState-em-effect.
  const measure = useCallback((el: HTMLSpanElement | null) => {
    if (!el) return;
    const cs = getComputedStyle(el);
    const r = contrastRatio(toHex(cs.color), toHex(cs.backgroundColor));
    setRatio((prev) => (prev === r ? prev : r));
  }, []);

  const pass = ratio !== null && ratio >= min;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 6,
      }}
    >
      <span
        ref={measure}
        style={{
          color: `var(${fg})`,
          background: `var(${bg})`,
          padding: "6px 10px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          fontSize: "var(--text-small-size)",
          minWidth: 240,
        }}
      >
        {label}
      </span>
      <code
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        {ratio ? formatRatio(ratio) : "…"} {pass ? "✓" : "✗"}{" "}
        <span style={{ opacity: 0.6 }}>(mín {min}:1)</span>
      </code>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--space-section-gap)" }}>
      <h3
        style={{
          fontSize: "var(--text-h3-size)",
          lineHeight: "var(--text-h3-line)",
          fontWeight: 500,
          margin: "0 0 12px",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Panel({ theme }: { theme: "light" | "dark" }) {
  return (
    <div
      data-theme={theme}
      style={{
        flex: 1,
        minWidth: 380,
        background: "var(--surface-page)",
        color: "var(--text-primary)",
        padding: "var(--space-panel-pad)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-section-gap)",
        }}
      >
        <strong style={{ fontSize: "var(--text-h2-size)", fontWeight: 500 }}>
          Modo {theme === "light" ? "claro" : "escuro"}
        </strong>
        <ThemeToggle />
      </div>

      <Section title="Rampa da marca">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {brandRamp.map((step) => (
            <div key={step} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-sm)",
                  background: `var(--brand-${step})`,
                  border: "1px solid var(--border)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contraste de texto (WCAG)">
        {textCombos.map((c) => (
          <ContrastRow key={c.label} {...c} />
        ))}
      </Section>

      <Section title="Setores (categórico)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {sectors.map((s) => (
            <span
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                background: `var(--sector-${s}-fill)`,
                color: `var(--sector-${s}-text)`,
                fontSize: "var(--text-small-size)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "var(--radius-full)",
                  background: `var(--sector-${s}-dot)`,
                }}
              />
              {s}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Tipografia (Inter)">
        {typeScale.map((t) => (
          <div
            key={t.token}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              marginBottom: 8,
            }}
          >
            <code
              style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 96 }}
            >
              {t.token}
            </code>
            <span
              style={{
                fontSize: `var(${t.size})`,
                lineHeight: `var(${t.line})`,
                fontWeight: t.weight,
              }}
            >
              {t.sample}
            </span>
          </div>
        ))}
        <p
          className="tnum"
          style={{
            marginTop: 12,
            fontSize: "var(--text-small-size)",
            color: "var(--text-secondary)",
          }}
        >
          Tabular (.tnum): 01/09 · 10/09 · 11/09 · 1.234
        </p>
      </Section>

      <Section title="Espaçamento">
        {spacing.map((token) => (
          <div
            key={token}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <code
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                minWidth: 160,
              }}
            >
              {token}
            </code>
            <div
              style={{
                height: 12,
                width: `var(${token})`,
                background: "var(--fill-brand)",
                borderRadius: 2,
              }}
            />
          </div>
        ))}
      </Section>
    </div>
  );
}

function Foundations() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        padding: 16,
        background: "var(--surface-sunken)",
      }}
    >
      <Panel theme="light" />
      <Panel theme="dark" />
    </div>
  );
}

const meta: Meta<typeof Foundations> = {
  title: "Fundação/Tokens",
  component: Foundations,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Foundations>;

export const Tokens: Story = {};
