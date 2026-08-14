# TarefaFácil

Gerenciador de tarefas e projetos por setores, com sincronização bidirecional
com o Google Agenda. SaaS multi-tenant.

## Documentos

- `docs/design.md` — fonte de verdade para tokens, componentes, regras de
  negócio e acessibilidade. Consulte antes de decidir qualquer coisa visual.
- `docs/build.md` — plano de construção em etapas (E00…E18).

## Stack

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 · Supabase ·
Radix UI · TanStack Query · dnd-kit · Zod · Storybook 9 · Vitest · Playwright

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run typecheck` — checagem de tipos (tsc --noEmit)
- `npm run format` — Prettier (escrita)
- `npm run test` — Vitest (unidade)
- `npm run test:e2e` — Playwright (e2e)
- `npm run storybook` — Storybook
- `npx supabase migration up` — aplica migrations

## Regras não negociáveis

1. Nenhum valor visual fora de `styles/tokens.css`. Zero hex, zero px avulso em
   componente. Falta um token? Crie o token primeiro.
2. Nenhum `any`. TypeScript strict.
3. Toda tabela tem `workspace_id` e RLS ativa. Chave secreta do Supabase nunca no
   cliente.
4. Todo componente interativo nasce com foco visível e navegação por teclado.
5. Server Components por padrão. `'use client'` só com estado ou evento.
6. Mutações otimistas — a interface não espera o servidor.
7. `outline: none` sem substituto é proibido.
8. `components/board/Board.tsx` é genérico e NÃO pode conhecer o tipo `Task`.
   Ele será reusado pelo funil de CRM (fase 4).
9. Subtarefa nunca gera evento no Google Agenda.
10. Sincronização com o Google é opt-in por tarefa, padrão desligado.

## Cores

Marca = **azul** `--brand-600` (#2563EB); acento = **lilás** `--accent-600`
(#7C3AED). O gradiente azul→lilás é a assinatura e só aparece em pontos
estratégicos, nunca como fundo global.
O **botão primário é grafite profundo** (`--button-primary-bg`), não a cor da
marca — é o que dá a sobriedade da referência.
Nunca use `--brand-500` como texto sobre branco: não atinge contraste.
Verde NÃO significa "concluído". Concluído é cinza + check + texto riscado.
Verde é reservado a **dado financeiro positivo** e à série de faturamento.
Setores nunca usam verde.

## Direção visual (ago/2026)

Pearl claro, minimalista, sóbrio. Proporção alvo: ~80% superfície sólida,
~15% translúcida, ~5% efeito.
**Liquid glass é seletivo** — casca lateral, campo de busca, botão primário,
item ativo da navegação, tooltip, menus, popovers, modais e hover da agenda.
Card de dado permanece sólido: legibilidade vem antes do efeito.
Use as classes `tf-glass` / `tf-glass-strong` / `tf-glass-edge`; nunca escreva
`backdrop-filter` solto em componente.
Hover de card sobe no máximo 2px (`tf-lift`). Nada de escala forte.

## Escrita de interface

Sentence case. Verbo primeiro em botão. Sem ponto final em rótulo.
Sem "por favor", sem "com sucesso", sem exclamação.
Erro diz o que aconteceu e o que fazer. Estado vazio é convite, não desculpa.

## Antes de escrever código

Mostre o plano de arquivos e as assinaturas antes da implementação.

## Decisões desta implementação (desvios registrados do plano)

- **Horário de término na tarefa (`due_end_time`).** Extensão do schema além do
  design (que só previa `due_time`): tarefa pode reservar um intervalo (ex.:
  reunião 15:30–17:00). Sem hora = dia inteiro; só início = 30min; início+fim =
  intervalo. Vale nos dois sentidos do sync com o Google. Pedido pelo dono
  (ago/2026).

- **Versões atuais em vez das fixadas no plano.** O plano (ago/2026) fixa
  Next.js 15 e Storybook 8. Como o tooling atual entrega Next.js 16.3, React 19 e
  Storybook 9 — e a arquitetura do plano não muda com isso — a base usa as
  versões atuais. Aprovado pelo dono em ago/2026.
- **Novo modelo de chaves do Supabase.** O projeto usa chaves `publishable` /
  `secret` (não os JWTs `anon` / `service_role` antigos). Variáveis:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`. A publishable respeita RLS; a secret ignora e fica só no
  servidor.
- **Ambiente Windows.** Node instalado em `C:\Program Files\nodejs`. Se `node`
  não estiver no PATH de um terminal novo, recarregue o PATH do registro.

## Next.js 16

O Next 16 tem breaking changes em relação a versões anteriores. Antes de escrever
código específico do framework, consulte `node_modules/next/dist/docs/`. As
regras auto-geradas do Next ficam em `AGENTS.md` (importado abaixo).

## Progresso das etapas

- [x] E00 — Setup do repositório
- [x] E01 — Tokens e tema
- [x] E02 — Banco de dados
- [x] E03 — Autenticação e workspace
- [x] E04 — AppShell
- [x] E05 — Átomos
- [x] E06 — Setores
- [x] E07 — Tarefas e criação rápida
- [x] E08 — Painel de detalhe
- [x] E09 — Board genérico e Kanban
- [x] E10 — Visão Hoje
- [x] E11 — Projetos
- [x] E12 — Calendário e peek
- [x] E13 — Anexos
- [x] E14 — Google Agenda (unidirecional)
- [x] E15 — Busca e filtros
- [x] E16 — Google Agenda (bidirecional)
- [x] E17 — Auditoria de acessibilidade
- [x] E18 — Preparação para SaaS (núcleo; marketing/onboarding guiado adiado)

@AGENTS.md
