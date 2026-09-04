import path from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname = import.meta.dirname;

// Fuso fixo para os testes, e é preciso dizer o que isto NÃO resolve.
//
// Há testes que codificam comportamento brasileiro de propósito — o bloco
// "fuso horário" de lib/reports/overview.test.ts é o exemplo: eles afirmam
// que uma entrega às 21h30 do dia 30 conta no mês 30. Isso é verdade no
// fuso de quem lê, e aquela conta roda em Client Component, então o fuso do
// leitor é o certo. Sem fixar aqui, os mesmos testes falham em qualquer
// máquina fora do horário de Brasília — e o GitHub Actions roda em UTC.
//
// **O que isto esconde:** código de SERVIDOR que dependa do fuso do
// ambiente passa a nunca falhar no teste, porque o teste também é
// brasileiro. Foi assim que a hora da página de aprovação saiu três horas
// adiantada em produção (4/set/2026) passando por 833 testes: Server
// Component na Vercel resolve em UTC. A defesa não é o fuso do teste, é
// nunca deixar o ambiente responder — data em servidor vai por
// `lib/utils/fuso.ts`, com o fuso escrito.
process.env.TZ = "America/Sao_Paulo";

// Dois projetos:
// - "unit": testes de unidade em jsdom (rápidos). É o que `npm run test` roda.
// - "storybook": roda as stories como testes no navegador (addon-vitest).
//   Executado por `npm run test:storybook`.
// Doc: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        plugins: [react()],
        // O "@/" do tsconfig precisa existir aqui também. Sem isto só
        // importação de TIPO funcionava (some na transformação); qualquer
        // valor de runtime importado por "@/" quebrava o teste.
        resolve: {
          alias: { "@": path.resolve(dirname, ".") },
        },
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["{app,components,lib,types}/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/.next/**"],
        },
      },
      {
        extends: true,
        plugins: [
          // Roda os testes das stories definidas no Storybook.
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
