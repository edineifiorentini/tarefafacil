# TAFLOW

Gerenciador de tarefas e projetos por setores, com sincronização bidirecional
com o Google Agenda. SaaS multi-tenant.

## Documentos

- `docs/design.md` — fonte de verdade para tokens, componentes, regras de
  negócio e acessibilidade. Consulte antes de decidir qualquer coisa visual.
- `docs/build.md` — plano de construção em etapas (E00…E18), todas concluídas.
- `docs/roadmap.md` — o que ainda não existe, por que foi adiado e o que
  precisa ser decidido antes. Consulte antes de propor "o que vem agora".
- `docs/changelog.md` — o que mudou para quem USA o produto, escrito à mão.
  Não é gerado de commit: correção de build não interessa a ninguém de fora, e
  o painel da plataforma não aparece porque o cliente não o enxerga.

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
9. **Subtarefa nunca gera evento para fora do sistema** — nem no Google
   Agenda, nem em webhook, nem no que vier depois. Subtarefa é item de
   conferência dentro de uma demanda, não um compromisso próprio: cada
   marcação viraria ruído na agenda de alguém ou na integração de alguém.
   Quem representa a demanda para fora é a demanda. Generalizado pelo dono
   em 27/ago/2026, quando a regra passou a valer também para os webhooks de
   saída.
10. Sincronização com o Google é opt-in por tarefa, padrão desligado.
11. **Toda tarefa pertence a um setor.** `task.sector_id` é `not null` com
    `on delete restrict`, e o workspace nasce com o setor "Geral"
    (migration 0043) para ninguém ficar preso em zero. É regra de produto,
    decidida pelo dono em 18/ago/2026 — não torne o campo opcional para
    "facilitar" um formulário. Se um dia existir tarefa sem setor, o quadro,
    a barra lateral, a busca, o painel e a etiqueta do chat precisam todos
    de um balde "sem setor".
12. **A marca do produto nunca entra em documento do cliente.** Sem logo da
    empresa (0080), a casca mostra a marca do TAFLOW — é o white-label
    por cima do padrão, decidido pelo dono em 31/ago/2026. Duas exceções,
    e as duas são regra, não detalhe:
    - **contrato impresso** cai no NOME da empresa. Aquele cabeçalho
      identifica a parte contratada, e a marca do fornecedor de software num
      documento jurídico de terceiro estaria errada;
    - **seletor de empresas** cai no nome. Se todas as empresas sem logo
      mostrassem a mesma marca padrão, a lista pararia de distingui-las.

    Quem controla isso é `queda="marca" | "nome"` em `WorkspaceMark`, separado
    do tamanho de propósito — amarrar as duas coisas foi o erro que produziu
    o seletor com três linhas idênticas.

13. **Cron do webhook é DIÁRIO enquanto a conta for Hobby.** O plano Hobby
    da Vercel aceita só um disparo por dia; expressão como `0 * * * *`
    **falha o deploy inteiro**, não o cron. Foi o que travou produção de
    27/ago a 2/set/2026: dezesseis commits empurrados, dezesseis builds
    falhados, e o sintoma era "nenhum deploy aparece". `vercel.json` é JSON
    estrito e não aceita comentário — por isso a regra está aqui. Voltar
    para de hora em hora só depois do plano Pro, e conferindo o deploy.

    O custo de ser diário: entrega de webhook pode demorar até 24h. Hoje
    isso não dói, porque não há nenhum destino cadastrado.

14. **Espaço é por EMPRESA, não por arquivo** (0086, 4/set/2026). O teto é
    `workspace.storage_limit_bytes`, 1 GB por padrão num servidor de 10 GB.
    O teto por arquivo em `lib/storage/quota.ts` existe só porque o Supabase
    impõe um — ele é espelho do limite do projeto, **nunca maior**, senão o
    arquivo passa aqui e estoura lá com um 413 sem explicação.

    Link do Google Drive (`kind = 'link'`) não ocupa byte e **nunca é
    apagado** — o arquivo não é nosso. É a saída de quem bate na cota.

    Material de aprovação sai do servidor 30 dias depois de aprovado, ou aos
    45 sem resposta. **Anexo interno não tem prazo**: briefing e referência
    são material de trabalho, e o dono pediu prazo para material de
    aprovação. Quem retira é a varredura de `/api/cron/limpar-anexos`, que é
    a operação INVERSA da varredura de órfãos ao lado — aquela apaga o que
    ninguém referencia, esta apaga arquivo vivo. Não junte as duas.

    **A linha do anexo sobrevive à retirada** (`purged_at`). É ela que
    sustenta o histórico e a frase que o cliente lê no lugar do arquivo.

## Cores

**A cor da marca é escolha da empresa** (0071), e o padrão desde a 0084 é
`taflow`: grafite `#171717` + acid lime `#C7FF38`. Empresa criada antes
mantém o que tinha — a migration só trocou o `default`.

O **acid lime nunca é texto sobre fundo claro**: 1.18:1, medido. Ele vive no
`--brand-300`, que é o degrau que só o tema ESCURO usa como link (15.99:1
sobre `#0f1117`). No claro o link é o `--brand-700`, grafite. Quem mexer na
rampa precisa medir com `lib/utils/contrast.ts`, não no olho.

O azul `#2563EB` continua na lista como opção e é a base do `:root` — por
isso `azul` não tem bloco `[data-brand]` próprio. Acento = **lilás**
`--accent-600` (#7C3AED), global e independente da cor escolhida; o
gradiente é a assinatura e só aparece em pontos estratégicos, nunca como
fundo global.

O **botão primário é grafite profundo** (`--button-primary-bg`), não a cor da
marca — é o que dá a sobriedade da referência, e vale mesmo no tema `taflow`:
o lime é destaque pequeno, decidido pelo dono em set/2026.
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
