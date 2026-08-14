# TarefaFácil — Plano de Construção

**Alvo:** execução assistida no Claude Code
**Base:** `tarefafacil-documentacao-design.md` (documento de design — fonte de verdade para tokens, componentes, regras e acessibilidade)
**Versão:** 1.0 — agosto de 2026

---

## 0. Como usar este arquivo

Este documento é o roteiro de construção. Ele não substitui a documentação de design — os dois vivem juntos no repositório.

**Fluxo recomendado:**

1. Coloque este arquivo e a documentação de design em `docs/` no repositório
2. Crie o `CLAUDE.md` na raiz com o conteúdo da seção 5 deste documento
3. Execute uma etapa por vez, na ordem. Cada etapa tem prompt sugerido e critério de aceite
4. **Não avance sem o critério de aceite cumprido.** Etapa pulada vira dívida que aparece três etapas depois
5. Ao fim de cada etapa, faça commit com a tag da etapa (`E03: auth e workspace`)

**Sobre o Claude Code:** o arquivo `CLAUDE.md` na raiz do projeto é lido automaticamente e serve como memória persistente do projeto — convenções, comandos, decisões. Documentação oficial: https://docs.claude.com/en/docs/claude-code/overview

**Regra de ouro para cada etapa:** peça o plano antes do código. "Me mostre o plano de arquivos e a assinatura das funções antes de escrever qualquer implementação." Revisar um plano custa 2 minutos; revisar 800 linhas de código errado custa uma tarde.

---

## 1. Decisões travadas antes de começar

| #   | Decisão                      | Valor                                                      | Muda depois?               |
| --- | ---------------------------- | ---------------------------------------------------------- | -------------------------- |
| D01 | Modo escuro na v1            | **sim**                                                    | caro — refatora todo token |
| D02 | Recorrência de tarefas na v1 | **não**, mas colunas reservadas no schema                  | barato se reservado        |
| D03 | Idioma                       | **pt-BR apenas**, strings centralizadas em um único módulo | médio                      |
| D04 | Notificações na fase 1       | **nenhuma**                                                | barato                     |
| D05 | Multi-tenant no banco        | **sim, desde E02**                                         | inviável depois            |

Se discordar de D01 ou D02, altere **antes** de executar E01 e E02 respectivamente.

---

## 2. Stack

```
Framework      Next.js 15 (App Router) + TypeScript strict
Estilo         Tailwind CSS v4 com tokens em CSS custom properties
Componentes    Radix UI primitives (headless) — sem biblioteca visual pronta
Ícones         @tabler/icons-react (outline, traço 1.5)
Banco/Auth     Supabase (Postgres + Auth + RLS + Storage)
Dados          TanStack Query v5
Formulários    React Hook Form + Zod
Datas          date-fns + date-fns-tz
Drag & drop    @dnd-kit/core + @dnd-kit/sortable
Documentação   Storybook 8
Testes         Vitest (unidade) + Playwright (e2e) + axe-core (a11y)
Deploy         Vercel + Supabase
```

**Por que não usar shadcn/ui pronto:** o TarefaFácil tem identidade visual própria (verde da marca, densidade calma, regra de um acento por tela). Colar um kit pronto significa lutar contra os padrões dele em toda tela. Radix dá o comportamento acessível; o visual vem dos nossos tokens.

**Por que Supabase:** RLS multi-tenant, autenticação e storage resolvidos. É Postgres padrão, então o custo de saída é baixo.

---

## 3. Convenções de código

### Estrutura de pastas

```
/app
  /(auth)/login
  /(app)
    /hoje
    /quadro
    /calendario
    /setor/[id]
    /projeto/[id]
    /config
  /api
    /gcal/callback
    /gcal/webhook
/components
  /ui           átomos: Button, TextInput, Checkbox, Badge...
  /task         TaskRow, TaskCard, TaskDetailPanel, SubtaskItem...
  /board        Board, BoardColumn (genéricos)
  /calendar     CalendarMonth, ProjectBar, PeekCard
  /shell        Sidebar, TopBar, AppShell
/lib
  /supabase     cliente browser e server
  /gcal         sincronização com o Google
  /queries      hooks do TanStack Query
  /validation   schemas Zod
  /utils
/styles
  tokens.css    todos os tokens, claro e escuro
/types
/docs
  design.md     documentação de design
  build.md      este arquivo
/supabase
  /migrations
```

### Regras não negociáveis

1. **Nenhum valor visual fora dos tokens.** Zero `#hex`, zero `px` avulso em componente. Se falta um token, o token é criado em `tokens.css` primeiro.
2. **Nenhum `any`.** TypeScript em modo strict.
3. **Toda query de banco passa por RLS.** Nunca usar a service role key no cliente.
4. **Todo componente interativo nasce acessível.** Se não tem foco visível e navegação por teclado, não está pronto.
5. **Server Components por padrão.** `'use client'` só onde há estado ou evento.
6. **Toda mutação é otimista.** O usuário não espera round-trip para ver o resultado.
7. **Nada de `outline: none`** sem substituto de foco visível.

### Nomenclatura

- Componentes: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Tabelas e colunas: `snake_case`
- Tokens CSS: `--categoria-nome-variante`
- Textos de interface: sentence case, sem ponto final em rótulo, verbo primeiro em botão

---

## 4. Etapas

> Cada etapa tem: **objetivo**, **entregas**, **prompt sugerido**, **critério de aceite**.

---

### E00 — Setup do repositório

**Objetivo:** projeto rodando, vazio, com todas as ferramentas configuradas.

**Entregas**

- Next.js 15 + TypeScript strict + Tailwind v4
- ESLint + Prettier
- Storybook 8 com addon-a11y
- Vitest e Playwright configurados
- Projeto Supabase criado, variáveis em `.env.local`
- `CLAUDE.md` na raiz (conteúdo na seção 5)

**Prompt**

```
Inicialize um projeto Next.js 15 com App Router, TypeScript strict, Tailwind v4,
ESLint e Prettier. Configure Storybook 8 com addon-a11y, Vitest para testes de
unidade e Playwright para e2e. Crie a estrutura de pastas descrita em docs/build.md
seção 3. Não crie nenhum componente ainda — só o esqueleto e as configurações.
Me mostre o plano de arquivos antes de executar.
```

**Aceite**

- [ ] `npm run dev` sobe sem erro
- [ ] `npm run storybook` abre
- [ ] `npm run lint` e `npm run test` passam
- [ ] Estrutura de pastas conforme seção 3

---

### E01 — Tokens e tema

**Objetivo:** todo o sistema de design em CSS custom properties, claro e escuro, antes de qualquer componente.

**Entregas**

- `styles/tokens.css` com as três camadas (global, alias, componente)
- Par escuro para cada token (D01)
- Integração com Tailwind v4 via `@theme`
- Fonte Inter Variable com `font-feature-settings: "tnum"` para datas
- Alternador de tema com persistência e respeito a `prefers-color-scheme`
- Página de Storybook exibindo a paleta completa nos dois modos

**Fonte:** documentação de design, seção 7 (valores exatos das rampas, escala tipográfica, espaçamento, raio, movimento).

**Atenção — correção já registrada:** o botão primário usa `--brand-600` como fundo (4.6:1 com branco), **não** `--brand-500` (3.2:1, reprovado para texto).

**Prompt**

```
Crie styles/tokens.css com todos os tokens da seção 7 de docs/design.md, em três
camadas: global, alias e componente. Gere o par de modo escuro para cada token,
mantendo os mesmos contrastes mínimos. Integre com Tailwind v4 via @theme.
Crie uma story no Storybook que exiba toda a paleta, escala tipográfica e
espaçamento nos dois modos, com a razão de contraste calculada ao lado de cada
combinação de texto sobre fundo.
```

**Aceite**

- [ ] Story de paleta renderiza nos dois modos
- [ ] Toda combinação de texto exibida atinge no mínimo 4.5:1
- [ ] Nenhum hex fora de `tokens.css`
- [ ] Alternância de tema sem flash de conteúdo não estilizado

---

### E02 — Banco de dados

**Objetivo:** schema completo, multi-tenant, com RLS ativa desde a primeira linha.

**Entregas**

- Migrations com todas as tabelas da seção 4.2 da documentação de design
- Índices da seção 4.3
- Políticas de RLS em todas as tabelas
- Colunas reservadas de recorrência em `task`: `recurrence_rule text null`, `recurrence_parent_id uuid null` (D02 — reservadas, não implementadas)
- Tipos TypeScript gerados a partir do schema
- Seed de desenvolvimento: 1 workspace, 3 setores, 2 projetos, 25 tarefas com casos extremos

**O seed precisa incluir casos difíceis:** título de 140 caracteres, tarefa com 12 subtarefas, setor vazio, projeto de 4 meses atravessando quebras de semana, tarefa atrasada há 30 dias, anexo com nome longo.

**Prompt**

```
Crie as migrations do Supabase com todas as tabelas, índices e políticas de RLS
descritas na seção 4 de docs/design.md. Adicione em task as colunas
recurrence_rule text null e recurrence_parent_id uuid null, sem implementar a
lógica. Gere os tipos TypeScript. Crie um seed de desenvolvimento com casos
extremos de conteúdo — títulos longos, setor vazio, projeto de 4 meses, tarefa
atrasada. Me mostre o SQL antes de aplicar.
```

**Aceite**

- [ ] Migrations aplicam e revertem sem erro
- [ ] RLS ativa em todas as tabelas — teste: usuário do workspace A não lê dado do workspace B
- [ ] Tipos gerados e importáveis
- [ ] Seed roda e popula o banco

---

### E03 — Autenticação e workspace

**Objetivo:** login funcionando, workspace criado automaticamente no primeiro acesso.

**Entregas**

- Login por e-mail com magic link + Google OAuth
- Criação automática de workspace e da linha em `workspace_member` no primeiro login
- Middleware de proteção de rotas
- Clientes Supabase para browser e server
- Contexto de workspace ativo
- Página de login e tela de carregamento

**Prompt**

```
Implemente autenticação com Supabase: magic link por e-mail e Google OAuth.
No primeiro login, crie automaticamente um workspace e a linha correspondente em
workspace_member com role owner. Crie o middleware de proteção de rotas, os
clientes Supabase para browser e server, e um contexto de workspace ativo.
A tela de login usa os tokens de E01.
```

**Aceite**

- [ ] Login e logout funcionam
- [ ] Primeiro login cria workspace
- [ ] Rota protegida redireciona para login
- [ ] Sessão persiste após recarregar

---

### E04 — AppShell

**Objetivo:** o esqueleto de navegação que todas as telas usam.

**Entregas**

- `Sidebar` de 240px: destinos, lista de setores, botão de novo setor, acesso a configurações
- `TopBar`: título da visão, filtros, busca, botão de nova tarefa
- `DetailPanel` de 400px que desliza sobre o conteúdo, sem substituir a tela
- Responsivo: abaixo de 1280px o painel vira sheet com overlay; abaixo de 1024px a sidebar colapsa
- Atalhos globais: `N`, `/`, `1`, `2`, `3`, `Esc`

**Referência:** seção 5.2 da documentação de design.

**Prompt**

```
Construa o AppShell conforme a seção 5.2 de docs/design.md: Sidebar 240px,
TopBar e DetailPanel 400px que desliza sobre o conteúdo. Implemente o
comportamento responsivo nos breakpoints 1280 e 1024. Adicione os atalhos globais
de teclado da seção 11.2. O DetailPanel usa role="dialog", prende o foco enquanto
aberto e devolve o foco ao elemento de origem ao fechar.
```

**Aceite**

- [ ] Painel desliza sem deslocar o conteúdo por trás
- [ ] Foco preso no painel aberto, devolvido ao fechar
- [ ] Atalhos funcionam e não conflitam com campos de texto
- [ ] Layout íntegro em 1440, 1280, 1024, 768, 375

---

### E05 — Átomos

**Objetivo:** biblioteca base documentada no Storybook antes de qualquer tela de produto.

**Entregas**
Componentes da seção 8.1 da documentação de design: `Button`, `IconButton`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Tag`, `Avatar`, `ProgressBar`, `Icon`, `Skeleton`.

Cada um com: todas as variantes e estados, API conforme o padrão da seção 8.6, e as stories obrigatórias (`Default`, `AllVariants`, `AllStates`, `Responsive`, `Accessibility`).

**Prompt**

```
Construa os átomos da seção 8.1 de docs/design.md usando Radix UI como base de
comportamento e nossos tokens para o visual. Siga o padrão de API da seção 8.6:
variantes como enum explícito, props obrigatórias só para o essencial, acessível
por padrão. Para cada componente, crie as cinco stories obrigatórias da seção 8.7.
Comece por Button e TextInput e me mostre para revisão antes de seguir.
```

**Aceite**

- [ ] Todos os átomos no Storybook com as 5 stories
- [ ] addon-a11y sem violações
- [ ] Nenhum valor visual fora dos tokens
- [ ] Foco visível em todos os interativos

---

### E06 — Setores

**Objetivo:** primeira funcionalidade de ponta a ponta — prova que a stack inteira funciona.

**Entregas**

- CRUD de setores com cor e ícone
- Sidebar renderizando setores reais
- Reordenação por arraste com equivalente por teclado
- Arquivar setor com fluxo de destino das tarefas (RN-06)
- Colunas padrão de Kanban criadas junto com o setor: A fazer, Fazendo, Revisão, Concluído

**Prompt**

```
Implemente o CRUD de setores: criar, editar nome, cor e ícone, reordenar e
arquivar. Ao criar um setor, crie automaticamente as quatro colunas padrão de
Kanban. Arquivar um setor deve oferecer mover as tarefas para outro setor ou
arquivá-las em bloco, conforme RN-06. Use TanStack Query com mutação otimista.
A reordenação precisa de alternativa por teclado.
```

**Aceite**

- [ ] Criar, editar, reordenar e arquivar funcionam
- [ ] Mutações otimistas — interface responde antes do servidor
- [ ] Colunas padrão criadas junto com o setor
- [ ] Reordenação acessível por teclado

---

### E07 — Tarefas e criação rápida

**Objetivo:** o núcleo do produto.

**Entregas**

- `QuickAdd` com três campos: título, setor, prazo (seção 6.1)
- `Enter` cria e mantém o formulário aberto; `Esc` fecha
- `TaskRow` com checkbox, título, ponto do setor, chip de prazo e tags
- Concluir tarefa com confirmação se houver subtarefas em aberto (RN-04)
- Exclusão com desfazer por 10 segundos
- `TaskList` filtrável

**Meta de desempenho:** do gatilho até a tarefa criada, menos de 8 segundos. É métrica, não aspiração.

**Prompt**

```
Implemente o QuickAdd da seção 6.1 de docs/design.md — exatamente três campos.
Enter cria e mantém aberto para registro em sequência. Construa TaskRow com
altura de 48px, onde toda a linha é alvo de clique exceto o checkbox. Concluir
uma tarefa com subtarefas em aberto abre a confirmação da RN-04. Exclusão mostra
desfazer por 10 segundos antes de efetivar.
```

**Aceite**

- [ ] Criar 10 tarefas em sequência sem tocar o mouse
- [ ] Concluir e desfazer funcionam
- [ ] Confirmação de subtarefas em aberto aparece
- [ ] `tnum` ativo — datas não deslocam a coluna

---

### E08 — Painel de detalhe

**Objetivo:** todo o contexto de uma tarefa em um só lugar.

**Entregas**

- Título editável inline
- Setor, projeto, prazo, prioridade, tags
- Descrição com autogrow
- Subtarefas: adicionar, reordenar, concluir, data opcional, aviso da RN-03
- Insights: log datado, editável por 5 minutos após criação (ADR-008)
- Salvamento automático com debounce de 800ms, indicador discreto, **sem botão salvar**

**Prompt**

```
Construa o TaskDetailPanel conforme a seção 6.2 de docs/design.md. Todos os
campos salvam automaticamente com debounce de 800ms — não crie botão de salvar.
Subtarefas seguem RN-01, RN-02 e RN-03: checklist com data opcional, sem anexo
nem responsável, aviso visual se a data passar do prazo da tarefa pai. Insights
são um log cronológico datado, editáveis por 5 minutos e imutáveis depois.
```

**Aceite**

- [ ] Edição salva sem ação explícita
- [ ] Aviso de data de subtarefa posterior ao prazo aparece e não bloqueia
- [ ] Insights ordenados cronologicamente
- [ ] Painel navegável inteiramente por teclado

---

### E09 — Board genérico e Kanban

**Objetivo:** o organismo que paga a fase 4 do roadmap.

**Entregas**

- `Board<T>` genérico com a API da seção 8.5 da documentação de design — **não pode conhecer "tarefa"**
- `BoardColumn` com cabeçalho, contador e área de soltura
- Arraste com `@dnd-kit`
- Movimento por teclado: `Espaço` entra em modo de movimento, setas movem, `Espaço` confirma, `Esc` cancela
- Menu de contexto com "Mover para"
- Anúncio por `aria-live` a cada movimento
- Ordenação fracionária em `numeric`
- Coluna marcada como `is_done_column` conclui a tarefa ao receber o card

**Este é o componente mais importante do repositório.** Se ele conhecer o tipo `Task`, a fase 4 vira reconstrução.

**Prompt**

```
Construa o componente Board genérico com exatamente a API da seção 8.5 de
docs/design.md. Ele recebe a entidade por props e NÃO pode importar nem
referenciar o tipo Task em lugar nenhum. Depois, crie o KanbanBoard que consome
o Board passando tarefas. Implemente as três formas de mover um card: arraste,
teclado e menu de contexto, conforme a seção 6.3. Cada movimento é anunciado por
aria-live. Use ordenação fracionária.
```

**Aceite**

- [ ] `Board.tsx` não contém a palavra "task" nem "tarefa"
- [ ] Movimento funciona por arraste, teclado e menu
- [ ] Movimento anunciado ao leitor de tela
- [ ] Posição fracionária — mover 50 cards não reescreve a coluna
- [ ] Soltar na coluna de conclusão marca `completed_at`

---

### E10 — Visão Hoje

**Objetivo:** a tela inicial, a que responde "o que faço agora".

**Entregas**

- Três grupos: atrasadas, hoje, próximos 7 dias
- Subtarefas com data aparecem no dia correspondente, marcadas como etapa da tarefa pai
- Estado vazio escrito como convite, não como desculpa
- Contadores por grupo

**Prompt**

```
Implemente a visão Hoje agrupando em atrasadas, hoje e próximos 7 dias.
Subtarefas com data aparecem no dia correspondente, visualmente subordinadas à
tarefa pai. O estado vazio é um convite à ação, com título que nomeia o espaço,
uma linha de apoio e um verbo como CTA — nada de "nada por aqui ainda".
```

**Aceite**

- [ ] Agrupamento correto no fuso do usuário
- [ ] Subtarefas datadas aparecem sem duplicar a tarefa pai
- [ ] Estado vazio com CTA funcional

---

### E11 — Projetos

**Objetivo:** agrupamento com duração.

**Entregas**

- CRUD de projeto com início, fim e status
- Página do projeto: tarefas, progresso, prazo
- Vincular tarefa a projeto (opcional — RN-05)
- Cálculo de progresso: concluídas sobre total

**Aceite**

- [ ] Tarefa sem projeto continua funcionando normalmente
- [ ] Progresso reflete conclusões em tempo real

---

### E12 — Calendário e peek

**Objetivo:** a lente do tempo.

**Entregas**

- Grade mensal com navegação
- Camada de projetos: barras horizontais atravessando dias, cortadas na quebra de semana
- Camada de tarefas: chips na célula do dia
- Seletor de camadas (projetos, tarefas, eventos do Google)
- `PeekCard` com teto de 6 informações (seção 6.4)
- Peek cumprindo o critério 1.4.13: dispensável por `Esc`, hoverável, persistente
- Delay de 350ms na entrada, 150ms na saída
- Foco por teclado abre o mesmo peek
- Mobile: toque curto abre sheet inferior
- Arrastar tarefa entre dias altera o prazo

**Prompt**

```
Construa o CalendarMonth com duas camadas independentes e seletor de camadas,
conforme a seção 6.4 de docs/design.md. Barras de projeto cortam e recomeçam na
quebra de semana. O PeekCard exibe no máximo 6 informações e cumpre integralmente
o critério WCAG 1.4.13 — dispensável, hoverável, persistente. Delay de 350ms na
entrada e 150ms na saída. Tab abre o mesmo peek que o hover. Em toque, abre como
sheet inferior com botão explícito para abrir o projeto.
```

**Aceite**

- [ ] Peek fecha com `Esc` sem mover o ponteiro
- [ ] Ponteiro entra no peek sem que ele desapareça
- [ ] `Tab` abre o peek
- [ ] Mês com 20 projetos permanece legível com o seletor de camadas
- [ ] Arrastar tarefa entre dias altera `due_date`

---

### E13 — Anexos

**Objetivo:** contexto junto da tarefa.

**Entregas**

- Upload direto ao bucket via URL assinada
- Arrastar arquivo para o painel
- Validação por magic number, não por extensão
- Limites da seção 10.2 da documentação de design
- Anexo por link (Google Drive) com aviso sobre permissão
- Exclusão adiada de 30 dias
- Barra de progresso e mensagem de erro acionável

**Prompt**

```
Implemente anexos conforme a seção 10 de docs/design.md. Upload direto ao
Supabase Storage por URL assinada, sem passar pelo servidor de aplicação.
Valide o tipo pelo magic number do arquivo, nunca pela extensão. Respeite os
limites da seção 10.2. Anexo por link exibe aviso de que o app não gerencia a
permissão do Drive. Exclusão marca para remoção em 30 dias, não apaga na hora.
Falha de upload mostra o motivo e um botão de tentar de novo.
```

**Aceite**

- [ ] Arquivo renomeado para burlar extensão é bloqueado
- [ ] Upload de 20MB com progresso visível
- [ ] Falha de rede não perde o arquivo silenciosamente

---

### E14 — Google Agenda, unidirecional

**Objetivo:** a tarefa aparece na agenda do usuário — e só quando ele pedir.

**Entregas**

- OAuth com os escopos mínimos da seção 9.1
- Alternador de sincronização por tarefa, **padrão desligado**
- Criar, editar e excluir evento conforme seção 9.4
- Mapeamento de campos da seção 9.3, incluindo `extendedProperties`
- Regra de dia inteiro versus horário
- Tratamento das falhas da seção 9.7
- Subtarefa **nunca** vira evento (RN-02)

**Prompt**

```
Implemente a sincronização unidirecional com o Google Agenda conforme as seções
9.1 a 9.4 e 9.7 de docs/design.md. O alternador é por tarefa e nasce desligado.
Grave sempre o extendedProperties.private.tarefafacil_task_id — é o que permite
reconhecer o evento na fase bidirecional. Subtarefas com data nunca geram evento.
Token expirado mostra banner persistente com botão de reconectar.
```

**Aceite**

- [ ] Nenhuma tarefa sincroniza sem ativação explícita
- [ ] Tarefa sem hora vira evento de dia inteiro
- [ ] Tarefa com 6 subtarefas datadas gera exatamente 1 evento
- [ ] Token revogado exibe o banner, sem erro no console

---

### E15 — Busca e filtros

**Entregas**

- Busca full-text em título, descrição e insights
- Filtros: setor, tag, prioridade, prazo, status
- Filtros combináveis, refletidos na URL
- Atalho `/` com foco imediato

**Aceite**

- [ ] Busca responde em menos de 200ms com 5.000 tarefas
- [ ] URL de filtro é compartilhável e restaura o estado

---

### E16 — Google Agenda, bidirecional

**Objetivo:** editar de qualquer lado e ver refletido no outro.

**Entregas**

- `events.watch` com renovação automática antes do TTL
- Endpoint de webhook
- Sincronização incremental por `syncToken`
- Tratamento de 410 com resincronização da janela de ±90 dias
- Resolução de conflito last-write-wins com marcação visível e desfazer por 24h (seção 9.6)
- Evento sem `extendedProperties` é ignorado

**Esta é a etapa mais cara do projeto.** Reserve o dobro do tempo que estimar.

**Prompt**

```
Implemente a sincronização bidirecional conforme as seções 9.5 e 9.6 de
docs/design.md. Canal de watch com renovação automática, sincronização
incremental por syncToken, resincronização em caso de 410. Eventos sem
extendedProperties.tarefafacil_task_id são ignorados — não importamos a agenda
inteira do usuário. Conflito resolve por last-write-wins, mas SEMPRE exibe o
marcador "editado no Google Agenda" na tarefa, com desfazer por 24 horas.
Escreva testes para: evento editado no Google, evento deletado no Google,
syncToken expirado, e edição simultânea nos dois lados.
```

**Aceite**

- [ ] Editar título no Google atualiza a tarefa em até 60 segundos
- [ ] Deletar evento no Google desliga `gcal_sync` sem apagar a tarefa
- [ ] Marcador de origem externa sempre visível após sync de entrada
- [ ] Os quatro cenários de teste passam

---

### E17 — Auditoria de acessibilidade

**Objetivo:** verificar, não presumir.

**Entregas**

- axe-core no pipeline de CI, falhando o build em violação
- Teste de navegação por teclado em todos os fluxos principais
- Teste manual com leitor de tela (NVDA ou VoiceOver)
- Verificação de contraste de todas as combinações, nos dois modos
- Checklist completo do Apêndice B da documentação de design
- Correção de tudo que aparecer

**Aceite**

- [ ] Zero violações do axe em todas as rotas
- [ ] Fluxo completo executável só com teclado: criar, editar, mover, concluir
- [ ] Todo contraste no mínimo 4.5:1 nos dois modos
- [ ] `prefers-reduced-motion` respeitado

---

### E18 — Preparação para SaaS

**Objetivo:** destravar a fase 3 sem construí-la inteira.

**Entregas**

- Convite por e-mail e aceite
- Papéis: owner, admin, member, viewer, com RLS por papel
- Atribuição de responsável em tarefa
- Página de configurações do workspace
- Exportação completa dos dados em JSON
- Página pública e onboarding

**Fora desta etapa:** cobrança. Só depois de existir alguém querendo pagar.

---

## 5. CLAUDE.md sugerido para a raiz do repositório

```markdown
# TarefaFácil

Gerenciador de tarefas e projetos por setores, com sincronização bidirecional
com o Google Agenda. SaaS multi-tenant.

## Documentos

- `docs/design.md` — fonte de verdade para tokens, componentes, regras de
  negócio e acessibilidade. Consulte antes de decidir qualquer coisa visual.
- `docs/build.md` — plano de construção em etapas.

## Stack

Next.js 15 App Router · TypeScript strict · Tailwind v4 · Supabase ·
Radix UI · TanStack Query · dnd-kit · Zod · Storybook · Vitest · Playwright

## Comandos

npm run dev · npm run build · npm run lint · npm run test ·
npm run test:e2e · npm run storybook · npx supabase migration up

## Regras não negociáveis

1. Nenhum valor visual fora de styles/tokens.css. Zero hex, zero px avulso em
   componente. Falta um token? Crie o token primeiro.
2. Nenhum `any`. TypeScript strict.
3. Toda tabela tem workspace_id e RLS ativa. Service role key nunca no cliente.
4. Todo componente interativo nasce com foco visível e navegação por teclado.
5. Server Components por padrão. 'use client' só com estado ou evento.
6. Mutações otimistas — a interface não espera o servidor.
7. `outline: none` sem substituto é proibido.
8. components/board/Board.tsx é genérico e NÃO pode conhecer o tipo Task.
   Ele será reusado pelo funil de CRM.
9. Subtarefa nunca gera evento no Google Agenda.
10. Sincronização com o Google é opt-in por tarefa, padrão desligado.

## Cores

Botão primário usa --brand-600 (#0D8850), não --brand-500. O 500 não atinge
contraste para texto branco.
Verde NÃO significa "concluído". Concluído é cinza + check + texto riscado.
Setores nunca usam verde.

## Escrita de interface

Sentence case. Verbo primeiro em botão. Sem ponto final em rótulo.
Sem "por favor", sem "com sucesso", sem exclamação.
Erro diz o que aconteceu e o que fazer. Estado vazio é convite, não desculpa.

## Antes de escrever código

Mostre o plano de arquivos e as assinaturas antes da implementação.
```

---

## 6. Ordem e dependências

```
E00 setup
 └─ E01 tokens ─────┐
 └─ E02 banco ──┐   │
                └─ E03 auth
                    └─ E04 shell ── E05 átomos
                                     └─ E06 setores
                                         └─ E07 tarefas
                                             ├─ E08 painel
                                             ├─ E09 board ── E11 projetos ── E12 calendário
                                             ├─ E10 hoje
                                             ├─ E13 anexos
                                             └─ E14 gcal push ── E16 gcal sync
                                                 └─ E15 busca
                                                     └─ E17 a11y
                                                         └─ E18 saas
```

**Marco de fim da fase 1:** E00 a E10 concluídas. Neste ponto você abandona sua ferramenta atual e usa o TarefaFácil por duas semanas. **Esse é o teste real** — não o checklist de aceite. Se você voltar para a ferramenta antiga, alguma coisa está errada e nenhuma etapa seguinte conserta.

**Marco de fim da fase 2:** E11 a E17. Nenhum contexto de trabalho vive fora do sistema.

---

## 7. Como pedir revisão ao Claude Code

Ao terminar uma etapa, antes do commit:

```
Revise a etapa E__ contra docs/design.md e docs/build.md. Verifique:
1. Algum valor visual fora dos tokens?
2. Algum componente sem foco visível ou navegação por teclado?
3. Alguma query sem proteção de RLS?
4. Algum estado não implementado (loading, vazio, erro)?
5. Alguma regra de negócio da seção 2.2 violada?
Liste apenas problemas materiais, em ordem de gravidade. Não elogie o código.
```

**"Não elogie o código" não é firula.** Revisão que começa com elogio esconde problema no meio da lista.
