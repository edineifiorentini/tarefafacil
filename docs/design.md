# TAFLOW — Documentação de Design e Produto

**Versão:** 1.0
**Data:** agosto de 2026
**Produzido por:** Design Squad — Design Chief, UX Designer, Visual Generator, Brad Frost (padrões atômicos), Design System Architect, UI Engineer
**Status:** fundação aprovada, pendente de validação em uso real

---

## 0. Como usar este documento

Este documento é a fonte de verdade para o design do TAFLOW. Ele é dividido em três blocos:

| Bloco               | Seções | Para quem                 |
| ------------------- | ------ | ------------------------- |
| Produto e decisões  | 1–3    | quem decide escopo        |
| Design e sistema    | 4–9    | quem desenha e implementa |
| Operação e evolução | 10–14  | quem planeja e mede       |

**Regra de manutenção:** decisões novas entram na seção 3 (ADR) com data. Nada de editar decisão antiga silenciosamente — o histórico é o que dá contexto ao próximo desenvolvedor. Um design system é produto, não projeto.

---

## 1. Produto

### 1.1 O que é

TAFLOW é um gerenciador de tarefas e projetos organizado por setores, com sincronização bidirecional com o Google Agenda, anexos, insights datados e visualização em Kanban, calendário e lista.

### 1.2 Modelo de negócio

**SaaS por assinatura, multi-tenant.**

Distinção importante que precisa ficar registrada: SaaS é o modelo comercial; BaaS (Supabase, Firebase) é uma escolha de infraestrutura. São camadas diferentes e compatíveis.

**Infra recomendada para a fase 1:** Supabase (Postgres + Auth + Row Level Security + Storage). Motivo: multi-tenancy, autenticação e storage vêm resolvidos, e o custo de saída é baixo porque o banco é Postgres padrão.

**Se você optar por backend próprio:** o que muda é a seção 10 (storage) e a necessidade de implementar RLS na aplicação em vez do banco. O modelo de dados da seção 4 permanece idêntico.

### 1.3 Usuário

**Fase 1 — usuário único (o fundador).** Profissional que gerencia trabalho de múltiplas frentes e hoje perde contexto entre calendário, anotações e arquivos espalhados.

**Fase 3 em diante — equipes pequenas.** 2 a 15 pessoas, sem hierarquia complexa.

**Decisão de escopo:** a interface é construída para usuário único agora. O _banco de dados_ é multi-tenant desde o primeiro commit. Ver ADR-001.

### 1.4 Problema central

Trabalho existe em três dimensões que hoje vivem em ferramentas separadas: **fluxo** (em que estágio está), **tempo** (quando vence) e **contexto** (arquivos, notas, decisões). Alternar entre ferramentas para reconstruir esse contexto é o custo real.

### 1.5 Princípios de produto

1. **Registrar tem que ser mais barato que lembrar.** Se criar uma tarefa custa mais que 5 segundos, o usuário para de registrar e o sistema morre.
2. **Uma verdade, várias lentes.** Kanban, calendário e lista mostram o mesmo dado. Nunca dados divergentes.
3. **O calendário do usuário é sagrado.** O app nunca polui o Google Agenda sem consentimento explícito por tarefa.
4. **Estrutura opcional.** Setor é obrigatório; projeto não é. Tarefa solta precisa funcionar.
5. **Nada trava o usuário por regra própria do sistema.** Avisos, não bloqueios.

### 1.6 Fora de escopo na v1

Chat interno, comentários, time tracking, relatórios gerenciais, automações condicionais, dependências entre tarefas, recorrência complexa, apps nativos.

---

## 2. Escopo funcional

### 2.1 Funcionalidades da v1

| #   | Funcionalidade                             | Prioridade  |
| --- | ------------------------------------------ | ----------- |
| F01 | Criar, editar, concluir e excluir tarefas  | obrigatória |
| F02 | Setores com cor e ícone                    | obrigatória |
| F03 | Projetos com data de início e fim          | obrigatória |
| F04 | Subtarefas (checklist com data opcional)   | obrigatória |
| F05 | Tags reutilizáveis no workspace            | obrigatória |
| F06 | Anexos (arquivo ou link)                   | obrigatória |
| F07 | Insights (log datado por tarefa)           | obrigatória |
| F08 | Visão Hoje                                 | obrigatória |
| F09 | Quadro Kanban por setor                    | obrigatória |
| F10 | Calendário com camadas de projeto e tarefa | obrigatória |
| F11 | Peek de projeto no calendário              | obrigatória |
| F12 | Sincronização com Google Agenda            | obrigatória |
| F13 | Busca e filtros                            | obrigatória |
| F14 | Colunas de Kanban customizáveis por setor  | desejável   |
| F15 | Modo escuro                                | desejável   |

### 2.2 Regras de negócio

**RN-01 — Subtarefa é checklist, não tarefa.** Tem texto, estado de conclusão e data opcional. Não tem anexo, responsável, tags nem subtarefas próprias. Se a etapa precisa disso, ela é uma tarefa.

**RN-02 — Data de subtarefa não gera evento no Google Agenda.** Aparece no app dentro do dia correspondente. Uma tarefa com 6 etapas datadas não pode virar 6 compromissos no calendário do usuário.

**RN-03 — Data de subtarefa posterior ao prazo da tarefa pai gera aviso visual, nunca bloqueio.**

**RN-04 — Concluir a tarefa pai não conclui as subtarefas automaticamente.** Mostra confirmação: "3 etapas em aberto. Concluir mesmo assim?" com as opções "Concluir tudo" e "Concluir só a tarefa".

**RN-05 — Tarefa pertence a exatamente um setor.** Pode pertencer a zero ou um projeto. Cruzamento entre setores é feito por tag, não por vínculo múltiplo.

**RN-06 — Excluir setor não exclui tarefas.** Oferece mover para outro setor ou arquivar em bloco.

**RN-07 — Toda tarefa nasce com `workspace_id`.** Sem exceção, mesmo na fase de usuário único.

**RN-08 — Sincronização com o Google é opcional por tarefa.** Padrão desligado. Ver seção 9.

---

## 3. Decisões arquiteturais registradas (ADR)

### ADR-001 — Multi-tenant desde o início, UX de usuário único

**Data:** ago/2026
**Decisão:** todo registro carrega `workspace_id` e o banco aplica Row Level Security desde o primeiro commit. A interface não expõe convites, papéis ou permissões na v1.
**Motivo:** adicionar multi-tenancy depois é migração de banco com downtime e reescrita de toda a camada de acesso. Já construir a interface de equipe é over-design — você constrói para um usuário hipotético e trava a evolução do usuário real.
**Consequência:** custo próximo de zero agora, evita reescrita na fase 3.

### ADR-002 — Subtarefa é checklist com data opcional

**Data:** ago/2026
**Decisão:** ver RN-01.
**Motivo:** tarefa aninhada recursiva é a principal fonte de complexidade descontrolada nessa categoria de produto. A régua "precisa de arquivo ou responsável? então é tarefa" é objetiva e defensável.
**Alternativa rejeitada:** hierarquia infinita de tarefas.

### ADR-003 — Kanban é lente, não estrutura

**Data:** ago/2026
**Decisão:** a tarefa é o dado. Kanban, calendário e lista são visualizações da mesma coleção. Arrastar no Kanban altera `status`; mover no calendário altera `due_date`.
**Motivo:** Kanban isolado esconde prazo; calendário isolado esconde progresso. Estruturar o dado em função de uma visão inviabiliza as outras.

### ADR-004 — Board como componente genérico

**Data:** ago/2026
**Decisão:** `Board` recebe a entidade, as colunas e o renderizador de card por props. Não conhece "tarefa".
**Motivo:** o funil de leads da fase 4 é estruturalmente o mesmo organismo — colunas, cards, movimentação. Curar o padrão existente em vez de construir um segundo board.
**Consequência:** custo marginal agora, economia de semanas na fase 4.

### ADR-005 — Sincronização com Google Agenda em duas etapas

**Data:** ago/2026
**Decisão:** fase 1 unidirecional (app → Google); fase 2 bidirecional via watch channel e sync token.
**Motivo:** bidirecional exige webhooks, tokens incrementais, resolução de conflito e tratamento de deleção externa. É a peça mais cara do sistema e não pode bloquear o uso real.

### ADR-006 — Storage em objeto, não em banco

**Data:** ago/2026
**Decisão:** arquivos em S3 ou compatível (Supabase Storage, R2), com URLs assinadas. Google Drive entra como "anexar por link", não como storage primário.
**Motivo:** blob em banco destrói custo de backup e a economia unitária de um SaaS. Drive como primário significa depender da permissão do Drive do cliente.

### ADR-007 — Verde da marca não sinaliza conclusão

**Data:** ago/2026
**Decisão:** estado "concluído" é sinalizado por forma e peso (check preenchido, texto em cinza, opacidade reduzida), não por cor verde.
**Motivo:** se a marca é verde e sucesso é verde, o sinal mais importante do produto se dissolve na identidade.

### ADR-008 — Insight é log datado, não campo único

**Data:** ago/2026
**Decisão:** insights são entradas com carimbo de data, em ordem cronológica.
**Motivo:** campo único faz o usuário sobrescrever o próprio raciocínio. O log preserva a evolução da tarefa e vira histórico de valor no SaaS.

---

## 4. Modelo de dados

### 4.1 Entidades

```
workspace
 └── sector
      └── project          (opcional)
           └── task
                ├── subtask
                ├── insight
                ├── attachment
                └── task_tag → tag
```

### 4.2 Esquema

```sql
workspace
  id              uuid pk
  name            text
  owner_user_id   uuid
  plan            text          -- free | pro | team
  created_at      timestamptz

app_user
  id              uuid pk
  email           text unique
  display_name    text
  avatar_url      text
  locale          text default 'pt-BR'
  timezone        text default 'America/Sao_Paulo'

workspace_member                -- ativa na fase 3
  workspace_id    uuid fk
  user_id         uuid fk
  role            text          -- owner | admin | member | viewer
  primary key (workspace_id, user_id)

sector
  id              uuid pk
  workspace_id    uuid fk
  name            text
  color           text          -- chave do token: violeta | azul | coral | rosa | grafite
  icon            text          -- nome do ícone tabler
  position        int
  archived_at     timestamptz

board_column                    -- colunas do Kanban, por setor
  id              uuid pk
  workspace_id    uuid fk
  sector_id       uuid fk
  name            text
  position        int
  is_done_column  boolean       -- mover para cá conclui a tarefa

project
  id              uuid pk
  workspace_id    uuid fk
  sector_id       uuid fk
  name            text
  description     text
  starts_on       date
  ends_on         date
  status          text          -- planejado | ativo | pausado | concluido
  archived_at     timestamptz

task
  id              uuid pk
  workspace_id    uuid fk
  sector_id       uuid fk       not null
  project_id      uuid fk       null
  column_id       uuid fk
  title           text          not null
  description     text
  due_date        date
  due_time        time          null      -- null = tarefa de dia inteiro
  priority        text          -- baixa | media | alta
  assignee_id     uuid fk       null      -- fase 3
  completed_at    timestamptz   null
  position        numeric                 -- ordenação fracionária dentro da coluna
  gcal_sync       boolean       default false
  gcal_event_id   text          null
  gcal_etag       text          null
  gcal_synced_at  timestamptz   null
  created_at      timestamptz
  updated_at      timestamptz

subtask
  id              uuid pk
  workspace_id    uuid fk
  task_id         uuid fk
  title           text
  due_date        date          null
  completed_at    timestamptz   null
  position        int

insight
  id              uuid pk
  workspace_id    uuid fk
  task_id         uuid fk
  body            text
  author_id       uuid fk
  created_at      timestamptz

attachment
  id              uuid pk
  workspace_id    uuid fk
  task_id         uuid fk
  kind            text          -- file | link
  storage_key     text          null    -- caminho no bucket, se kind = file
  external_url    text          null    -- se kind = link
  filename        text
  mime_type       text
  size_bytes      bigint
  uploaded_by     uuid fk
  created_at      timestamptz

tag
  id              uuid pk
  workspace_id    uuid fk
  name            text
  color           text
  unique (workspace_id, lower(name))

task_tag
  task_id         uuid fk
  tag_id          uuid fk
  primary key (task_id, tag_id)
```

### 4.3 Índices obrigatórios

```sql
create index on task (workspace_id, due_date) where completed_at is null;
create index on task (workspace_id, sector_id, column_id, position);
create index on task (workspace_id, project_id);
create index on task (gcal_event_id) where gcal_event_id is not null;
create index on subtask (task_id, position);
create index on project (workspace_id, starts_on, ends_on);
```

### 4.4 Multi-tenancy

Toda tabela carrega `workspace_id`. Política de RLS padrão:

```sql
alter table task enable row level security;

create policy tenant_isolation on task
  using (workspace_id in (
    select workspace_id from workspace_member
    where user_id = auth.uid()
  ));
```

Na fase 1, `workspace_member` contém uma linha. A política já funciona e não precisa ser reescrita depois.

### 4.5 Ordenação fracionária

`task.position` é `numeric`, não `int`. Ao arrastar um card entre dois vizinhos com posições 1.0 e 2.0, o novo valor é 1.5. Evita reescrever a coluna inteira a cada movimento. Rebalanceamento em background quando a diferença entre vizinhos cai abaixo de 0.0001.

---

## 5. Arquitetura de informação

### 5.1 Navegação — quatro destinos

| Destino        | Pergunta que responde          | Conteúdo                            |
| -------------- | ------------------------------ | ----------------------------------- |
| **Hoje**       | O que preciso fazer agora?     | Atrasadas, hoje, próximos 7 dias    |
| **Quadro**     | Como o trabalho está fluindo?  | Kanban filtrável por setor          |
| **Calendário** | Como o tempo está distribuído? | Mês com camadas de projeto e tarefa |
| **Setores**    | Onde está aquilo?              | Navegação lateral persistente       |

**Hoje é a tela inicial.** Não o Kanban. O Kanban responde "como está o trabalho", que é uma pergunta de revisão, não de execução diária.

As três primeiras são lentes sobre a mesma coleção. Nunca dados divergentes.

### 5.2 Estrutura da tela

```
┌──────────┬────────────────────────────────────────┬─────────────┐
│ Sidebar  │  Barra superior                        │  Painel de  │
│ 240px    │  título · filtros · busca · + nova     │  detalhe    │
│          ├────────────────────────────────────────┤  400px      │
│ Hoje     │                                        │  (desliza   │
│ Quadro   │  Área de conteúdo                      │   ao        │
│ Calendár.│  Hoje / Quadro / Calendário            │   clicar    │
│          │                                        │   numa      │
│ SETORES  │                                        │   tarefa)   │
│ ● Market.│                                        │             │
│ ● Comerc.│                                        │             │
│ + Setor  │                                        │             │
│          │                                        │             │
│ Config.  │                                        │             │
└──────────┴────────────────────────────────────────┴─────────────┘
```

O painel de detalhe **desliza sobre o conteúdo, não substitui a tela**. O usuário nunca perde o contexto de onde a tarefa vive. Em telas abaixo de 1280px, vira sheet lateral com overlay.

### 5.3 Profundidade máxima

Três níveis de clique até qualquer dado: destino → tarefa → anexo. Nada mais fundo.

---

## 6. Fluxos principais

### 6.1 Criação rápida de tarefa

**Gatilho:** botão "+ Nova tarefa", tecla `N`, ou clicar numa célula do calendário.

**Campos na criação:** título, setor, prazo. Três campos.

```
┌──────────────────────────────────────────┐
│  Título da tarefa                        │
│  [_______________________________]       │
│                                          │
│  [Setor ▾]  [Prazo ▾]        [Criar]     │
└──────────────────────────────────────────┘
```

O resto (descrição, tags, subtarefas, anexos, insights, sincronização) vive no painel de detalhe, aberto ao clicar na tarefa.

**Justificativa:** exigir 9 campos na criação faz o usuário parar de registrar tarefas em duas semanas. É o padrão de abandono mais documentado nessa categoria.

**Enter cria e mantém o formulário aberto** para registrar várias em sequência. Esc fecha.

### 6.2 Trabalhar numa tarefa

1. Clique na tarefa → painel de detalhe desliza da direita
2. Painel exibe, em ordem: título editável inline · setor e projeto · prazo · prioridade · tags · descrição · subtarefas · anexos · insights · alternador de sincronização
3. Toda edição salva automaticamente com debounce de 800ms
4. Indicador discreto de "salvo" no rodapé do painel, sem toast

**Sem botão Salvar.** Formulário com botão salvar em painel de edição contínua é fonte de perda de trabalho.

### 6.3 Mover no Kanban

- **Mouse:** arrastar o card entre colunas
- **Teclado:** foco no card → `Espaço` entra em modo de movimento → setas movem → `Espaço` confirma, `Esc` cancela
- **Menu:** botão de contexto no card com "Mover para ▸"

Drag-and-drop **nunca** pode ser o único caminho. Ver seção 11.

### 6.4 Consultar um projeto no calendário

1. Projetos aparecem como barras horizontais atravessando os dias
2. Hover (ou foco por teclado) abre o cartão de peek após 350ms
3. Clique na barra abre a página do projeto

**Conteúdo do peek — teto de 6 informações:**
nome · setor · período · progresso (x de y tarefas) · próximo prazo · alerta de atraso

Passou de 6, virou uma segunda tela e destruiu o propósito do peek, que é decidir _se_ vale abrir.

### 6.5 Anexar arquivo

1. Arrastar para o painel de detalhe, ou botão "Anexar"
2. Cliente solicita URL assinada ao servidor
3. Upload direto ao bucket, com barra de progresso
4. Registro criado em `attachment` após confirmação
5. Falha exibe o motivo e um botão "Tentar de novo" — nunca some silenciosamente

---

## 7. Design tokens

### 7.1 Cor — rampa da marca

```
--brand-50   #F0FAF3
--brand-100  #D6F2E0
--brand-200  #A9E4C2    pastel green
--brand-300  #7AD3A2
--brand-400  #45BC7F
--brand-500  #12A05F    ação primária
--brand-600  #0D8850    irish green — hover, pressionado
--brand-700  #0A6C40    texto e link (6.4:1 em branco)
--brand-800  #08512F
--brand-900  #063A22
```

**Regras de aplicação — não negociáveis:**

| Regra                                             | Valor                           |
| ------------------------------------------------- | ------------------------------- |
| Elementos brand-500 por tela                      | exatamente 1 (o botão primário) |
| Texto e link                                      | brand-700, nunca brand-500      |
| Superfície selecionada, dia de hoje, coluna ativa | brand-50 / brand-100            |
| Barras de progresso, chips, preenchimentos        | brand-200                       |
| Texto sobre brand-200 ou mais claro               | proibido — não atinge 4.5:1     |

### 7.2 Cor — semântica

```
--color-overdue      #D64545    atrasado
--color-overdue-bg   #FCEBEB
--color-due-soon     #BA7517    prazo em até 48h
--color-due-soon-bg  #FAEEDA
--color-done-text    #888780    concluído (cinza, não verde — ADR-007)
```

### 7.3 Cor — setores (categórica)

Nenhum verde, para não competir com a marca.

```
violeta   fill #EEEDFE   text #3C3489   dot #7F77DD
azul      fill #E6F1FB   text #0C447C   dot #378ADD
coral     fill #FAECE7   text #712B13   dot #D85A30
rosa      fill #FBEAF0   text #72243E   dot #D4537E
grafite   fill #F1EFE8   text #2C2C2A   dot #888780
```

### 7.4 Cor — neutros e superfícies

```
--surface-page     #FBFBFA
--surface-card     #FFFFFF
--surface-sunken   #F4F4F2
--border           rgba(0,0,0,0.08)
--border-strong    rgba(0,0,0,0.14)
--text-primary     #1C1C1A
--text-secondary   #5F5E5A
--text-muted       #8E8D88
```

### 7.5 Tipografia

**Família única: Inter Variable.** Com `font-feature-settings: "tnum"` em datas e números, para as colunas não dançarem.

| Token          | Tamanho | Peso | Entrelinha | Uso                             |
| -------------- | ------- | ---- | ---------- | ------------------------------- |
| `text-caption` | 12px    | 400  | 1.4        | metadados, contadores           |
| `text-small`   | 14px    | 400  | 1.5        | texto secundário, labels        |
| `text-body`    | 16px    | 400  | 1.6        | corpo, título de tarefa         |
| `text-h3`      | 20px    | 500  | 1.3        | título de card, seção do painel |
| `text-h2`      | 24px    | 500  | 1.25       | título de página                |
| `text-h1`      | 32px    | 500  | 1.2        | título de projeto               |

**Dois pesos apenas: 400 e 500.** Nada de 600 ou 700 — peso pesado destrói o "calmo" pedido no briefing.

### 7.6 Espaçamento

Base 4px. Escala restrita: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.

| Token                                   | Valor |
| --------------------------------------- | ----- |
| `space-row` (altura da linha de tarefa) | 48px  |
| `space-card-pad`                        | 20px  |
| `space-card-gap`                        | 16px  |
| `space-section-gap`                     | 32px  |
| `space-panel-pad`                       | 24px  |
| `max-width-read`                        | 720px |

### 7.7 Raio e elevação

```
--radius-sm    8px     controles: botão, input, chip
--radius-md   12px     cards, painéis
--radius-lg   16px     modais, sheets
--radius-full 999px    avatar, badge circular

--shadow-panel   0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)
--shadow-peek    0 2px 8px rgba(0,0,0,0.10)
```

Elevação só em conteúdo flutuante. Cards em fluxo usam borda de 1px, não sombra.

### 7.8 Movimento

```
--dur-fast   120ms    hover, mudança de cor
--dur-base   180ms    padrão: painéis, transições de estado
--dur-slow   240ms    sheets, modais
--ease-out   cubic-bezier(0.2, 0, 0, 1)
```

Toda animação envolvida em `@media (prefers-reduced-motion: reduce)` cai para 0ms.

### 7.9 Camadas de token

| Camada     | Exemplo                                      | Regra                                     |
| ---------- | -------------------------------------------- | ----------------------------------------- |
| Global     | `--brand-500: #12A05F`                       | valor cru, sem semântica                  |
| Alias      | `--action-primary: var(--brand-500)`         | significado, agnóstico de componente      |
| Componente | `--button-primary-bg: var(--action-primary)` | só quando o componente exige exceção real |

**Aviso registrado:** a camada de componente é onde sistemas de design apodrecem. Um cliente chegou a 5.000 tokens de componente e o sistema virou intransitável. **Só crie um token de componente quando existir uma exceção que o alias não cobre.** Na dúvida, use o alias.

---

## 8. Biblioteca de componentes

Organizada por design atômico. A hierarquia é modelo mental, não processo linear.

### 8.1 Átomos

| Componente    | Variantes                                  | Estados                                            |
| ------------- | ------------------------------------------ | -------------------------------------------------- |
| `Button`      | primary, secondary, ghost, danger · sm, md | default, hover, active, focus, disabled, loading   |
| `IconButton`  | ghost, subtle · sm, md                     | idem                                               |
| `TextInput`   | default, error                             | default, hover, focus, disabled, error             |
| `Textarea`    | autogrow                                   | idem                                               |
| `Select`      | —                                          | idem                                               |
| `Checkbox`    | default, round (subtarefa)                 | unchecked, checked, indeterminate, focus, disabled |
| `Badge`       | neutral, brand, overdue, due-soon          | —                                                  |
| `Tag`         | com e sem botão de remover                 | default, hover, focus                              |
| `Avatar`      | initials, image · sm, md                   | —                                                  |
| `ProgressBar` | —                                          | —                                                  |
| `Icon`        | Tabler outline, traço 1.5px, 20px          | —                                                  |
| `Skeleton`    | text, block                                | —                                                  |

### 8.2 Moléculas

| Componente       | Composição                                        | Notas                                                         |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `TaskRow`        | Checkbox + título + SectorDot + DueChip + TagList | altura 48px; toda a linha é alvo de clique exceto o checkbox  |
| `SubtaskItem`    | Checkbox round + texto + data opcional            | data em `text-caption`; aviso se posterior ao prazo da tarefa |
| `DueChip`        | Icon + data formatada                             | cor muda por proximidade: neutro / due-soon / overdue         |
| `SectorDot`      | círculo 8px + nome                                | cor da tabela 7.3                                             |
| `TagList`        | Tag[] + overflow "+N"                             | máximo 3 visíveis inline                                      |
| `AttachmentChip` | Icon por mime + nome + tamanho + remover          | clique abre; não baixa direto                                 |
| `InsightEntry`   | data + autor + corpo                              | somente leitura após criado; editável por 5 minutos           |
| `FieldRow`       | label + controle                                  | usado em todo o painel de detalhe                             |
| `EmptyState`     | Icon + título + linha de apoio + CTA              | um convite, não um pedido de desculpas                        |
| `PeekCard`       | ver 6.4                                           | teto de 6 informações                                         |

### 8.3 Organismos

| Componente        | Responsabilidade                                                    |
| ----------------- | ------------------------------------------------------------------- |
| `Sidebar`         | navegação, lista de setores, criação de setor                       |
| `TopBar`          | título da visão, filtros, busca, botão de nova tarefa               |
| `QuickAdd`        | criação em 3 campos                                                 |
| `TaskDetailPanel` | edição completa da tarefa                                           |
| `Board`           | **genérico** — ver 8.5                                              |
| `BoardColumn`     | cabeçalho, contador, lista de cards, drop target                    |
| `TaskCard`        | render de tarefa dentro do Board                                    |
| `TodayView`       | agrupamento por atrasadas / hoje / próximos 7 dias                  |
| `CalendarMonth`   | grade + camada de projetos + camada de tarefas + seletor de camadas |
| `ProjectBar`      | barra de projeto, cortada por quebra de semana                      |
| `TaskList`        | lista filtrável e ordenável                                         |
| `FilterBar`       | setor, tag, prioridade, prazo, status                               |

### 8.4 Templates e páginas

**Templates:** `AppShell` (sidebar + conteúdo + painel), `FullPageLayout` (projeto, configurações).

**Páginas:** Hoje · Quadro · Calendário · Setor · Projeto · Configurações · Conta.

**Regra de teste:** toda página é validada com conteúdo real — títulos longos, setor sem nenhuma tarefa, projeto de 4 meses, tarefa com 12 subtarefas, anexo com nome de 80 caracteres. Nada de lorem ipsum em revisão de design.

### 8.5 API do Board — o componente que paga a fase 4

O `Board` não conhece "tarefa". Recebe a entidade por props. Quando o funil de leads chegar na fase 4, ele reusa este mesmo organismo.

```ts
interface BoardProps<T> {
  columns: BoardColumn[];
  items: T[];
  getItemId: (item: T) => string;
  getColumnId: (item: T) => string;
  getPosition: (item: T) => number;
  renderCard: (item: T) => ReactNode;
  onMove: (itemId: string, toColumnId: string, toPosition: number) => void;
  onColumnCreate?: (name: string) => void;
  onColumnRename?: (id: string, name: string) => void;
  emptyColumnSlot?: (column: BoardColumn) => ReactNode;
  isLoading?: boolean;
}
```

### 8.6 API do Button (referência de padrão)

```ts
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger"; // default: 'secondary'
  size?: "sm" | "md"; // default: 'md'
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
}
```

**Padrão de API para todos os componentes:**

- Props obrigatórias apenas para o que o componente não funciona sem
- Variantes como enum explícito, nunca string arbitrária
- Composição por children antes de injeção por prop
- Acessível por padrão: ARIA, foco e teclado embutidos, não opcionais

### 8.7 Documentação por componente

Todo componente entra no Storybook com: propósito e quando usar · tabela de props com tipos e padrões · exemplo visual de cada variante e estado · notas de acessibilidade · o que fazer e o que não fazer · exemplo de código.

Stories obrigatórias: `Default`, `AllVariants`, `AllStates`, `Responsive`, `Accessibility`.

---

## 9. Integração com Google Agenda

### 9.1 Escopos OAuth

```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.readonly
```

Escopo mínimo necessário. Nada de `calendar` completo.

### 9.2 O que vira evento

| Condição da tarefa        | Resultado no Google                      |
| ------------------------- | ---------------------------------------- |
| `gcal_sync = false`       | nada. **Este é o padrão.**               |
| `due_date` sem `due_time` | evento de dia inteiro                    |
| `due_date` com `due_time` | evento com horário, duração padrão 30min |
| Subtarefa com data        | **nunca vira evento** (RN-02)            |
| Projeto                   | não vira evento na v1                    |

### 9.3 Mapeamento de campos

| TAFLOW                        | Google Calendar                                  |
| ---------------------------------- | ------------------------------------------------ |
| `title`                            | `summary`                                        |
| `description` + link para a tarefa | `description`                                    |
| `due_date` / `due_time`            | `start` / `end`                                  |
| `sector.color`                     | `colorId` (mapeado ao equivalente mais próximo)  |
| `id`                               | `extendedProperties.private.tarefafacil_task_id` |

O `extendedProperties` é o que permite reconhecer o evento na volta, mesmo que o usuário o tenha renomeado no Google.

### 9.4 Fase 1 — unidirecional

App escreve no Google. Criar tarefa com sync ativo → `events.insert`. Editar → `events.patch` usando `gcal_etag` para detecção otimista de conflito. Concluir ou excluir → `events.delete`.

### 9.5 Fase 2 — bidirecional

1. `events.watch` cria um canal de notificação com TTL; renovação agendada antes da expiração
2. Notificação recebida → `events.list` com `syncToken` armazenado, buscando apenas o delta
3. Evento com `extendedProperties.tarefafacil_task_id` → atualiza a tarefa correspondente
4. Evento sem essa propriedade → ignorado (não importamos a agenda inteira do usuário)
5. `syncToken` inválido (410) → resincronização completa da janela de ±90 dias

### 9.6 Resolução de conflito

**Estratégia: last-write-wins por timestamp, com marcação visível.**

Quando a edição vem do Google, a tarefa exibe um marcador discreto: "Editado no Google Agenda · há 3 min", com opção de desfazer por 24 horas.

**Silêncio em conflito de sincronização é o que faz o usuário perder confiança no produto.** O marcador não é enfeite — é o que sustenta a confiança.

### 9.7 Falhas

| Falha                     | Comportamento                                             |
| ------------------------- | --------------------------------------------------------- |
| Token expirado            | banner persistente: "Reconecte o Google Agenda" com botão |
| Quota excedida            | fila com backoff exponencial; nada é perdido              |
| Evento deletado no Google | tarefa permanece, `gcal_sync` vira false, aviso na tarefa |
| Rede indisponível         | fila local; sincroniza ao voltar                          |

---

## 10. Arquivos e storage

### 10.1 Estratégia

Bucket de objetos com URLs assinadas. Cliente faz upload direto, sem passar pelo servidor de aplicação.

**Convenção de caminho:**

```
{workspace_id}/{task_id}/{attachment_id}-{filename_sanitizado}
```

### 10.2 Limites e validação

| Parâmetro                           | Valor v1   |
| ----------------------------------- | ---------- |
| Tamanho máximo por arquivo          | 25 MB      |
| Anexos por tarefa                   | 20         |
| Cota por workspace (plano free)     | 1 GB       |
| Validade da URL assinada de leitura | 5 minutos  |
| Validade da URL assinada de escrita | 15 minutos |

**Validação de tipo pelo magic number, não pela extensão.** Extensão é declaração do cliente; magic number é fato.

Lista permitida na v1: imagens (jpg, png, webp, gif, svg com sanitização), documentos (pdf, docx, xlsx, pptx, txt, md, csv), compactados (zip). Executáveis bloqueados.

### 10.3 Google Drive

Entra como `kind = 'link'`: o usuário cola a URL do Drive, o app armazena a referência e exibe o chip com ícone do Drive. **O app não gerencia permissão do Drive** — se o link é restrito, quem abre precisa ter acesso. Isso é comunicado no momento de anexar.

### 10.4 Exclusão

Excluir anexo remove o registro imediatamente e enfileira a remoção do objeto para 30 dias depois. Excluir tarefa arquiva os anexos pela mesma janela. Nada é apagado de forma irreversível na mesma sessão.

---

## 11. Acessibilidade

**Padrão: WCAG 2.1 nível AA. Baseline, não teto.**

### 11.1 Contraste — verificado

| Combinação                                   | Razão  | Situação                                                                       |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `text-primary` #1C1C1A sobre #FFFFFF         | 16.1:1 | aprovado                                                                       |
| `text-secondary` #5F5E5A sobre #FFFFFF       | 6.6:1  | aprovado                                                                       |
| `text-muted` #8E8D88 sobre #FFFFFF           | 3.4:1  | **só para texto ≥ 18px ou não essencial**                                      |
| `brand-700` #0A6C40 sobre #FFFFFF            | 6.4:1  | aprovado para texto e link                                                     |
| `brand-500` #12A05F sobre #FFFFFF            | 3.2:1  | **só componentes de interface, nunca texto pequeno**                           |
| Branco sobre `brand-500`                     | 3.2:1  | **reprovado para texto** — botão primário usa branco sobre `brand-600` (4.6:1) |
| `overdue` #D64545 sobre `overdue-bg` #FCEBEB | 4.9:1  | aprovado                                                                       |

**Correção registrada:** o botão primário usa `brand-600` como fundo, não `brand-500`. `brand-500` fica para bordas, ícones e elementos não textuais.

### 11.2 Teclado

| Tecla                 | Ação                                           |
| --------------------- | ---------------------------------------------- |
| `N`                   | nova tarefa                                    |
| `/`                   | busca                                          |
| `1` `2` `3`           | Hoje, Quadro, Calendário                       |
| `Tab`                 | percorre elementos interativos na ordem visual |
| `Espaço` no card      | entra e sai do modo de movimento do Kanban     |
| `Esc`                 | fecha painel, peek, modal, modo de movimento   |
| `Enter` no `QuickAdd` | cria e mantém aberto                           |

Foco visível em **todos** os elementos interativos: anel de 2px em `brand-600` com offset de 2px. Nunca `outline: none` sem substituição.

### 11.3 Conteúdo em hover e foco (critério 1.4.13)

O peek do calendário cumpre os três requisitos:

- **Dispensável:** `Esc` fecha sem mover o ponteiro
- **Hoverável:** o ponteiro pode entrar no cartão sem que ele desapareça
- **Persistente:** permanece até o usuário dispensar, mover o foco ou sair da área

Delay de 350ms na entrada, 150ms na saída. Foco por teclado abre o mesmo cartão. **Hover nunca é o único caminho para uma informação.**

### 11.4 Drag-and-drop

Todo movimento por arraste tem equivalente por teclado e por menu de contexto (6.3). Movimento anunciado por `aria-live="polite"`: "Tarefa movida para Em revisão, posição 2 de 5."

### 11.5 Leitor de tela

- Marcos semânticos: `<nav>`, `<main>`, `<aside>`, `<header>`
- Kanban: `role="list"` nas colunas, `role="listitem"` nos cards, `aria-label` com nome da coluna e contagem
- Calendário: `role="grid"` com `aria-label` de data completa por célula
- Painel de detalhe: `role="dialog"` com `aria-labelledby` apontando para o título, foco preso enquanto aberto, retorno ao elemento de origem ao fechar
- Todo campo tem `<label>` associado, jamais só `placeholder`
- Erro de formulário associado por `aria-describedby`, anunciado por `aria-live`

### 11.6 Independência de cor

Nenhuma informação depende exclusivamente de cor:

| Informação | Cor          | Reforço                            |
| ---------- | ------------ | ---------------------------------- |
| Atrasado   | vermelho     | ícone de alerta + texto "Atrasado" |
| Concluído  | cinza        | check preenchido + texto riscado   |
| Setor      | cor do ponto | nome do setor sempre visível       |
| Prioridade | —            | rótulo textual, não só cor         |

### 11.7 Alvos de toque

Mínimo de 44×44px em qualquer contexto touch. A linha de tarefa de 48px já cumpre; checkboxes de 20px recebem área de toque expandida por padding invisível.

---

## 12. Roadmap por fases

### Fase 0 — Fundação (1 a 2 semanas)

Esquema do banco com RLS · tokens em código · Storybook com átomos e moléculas · `AppShell` · autenticação

**Critério de saída:** login funciona, tokens aplicados, átomos documentados.

### Fase 1 — MVP pessoal (3 a 4 semanas)

Setores · tarefas · subtarefas · tags · Hoje · Quadro · painel de detalhe · sincronização unidirecional com o Google

**Critério de saída:** você abandona sua ferramenta atual e usa o TAFLOW por 2 semanas seguidas. Este é o teste real, não o checklist.

### Fase 2 — Contexto completo (2 a 3 semanas)

Projetos · calendário com camadas e peek · anexos · insights · busca e filtros · sincronização bidirecional

**Critério de saída:** nenhum contexto de trabalho vive fora do sistema.

### Fase 3 — SaaS (4 a 6 semanas)

Convites e papéis · atribuição de responsável · notificações · planos e cobrança · onboarding · página pública · exportação de dados

**Critério de saída:** um estranho se cadastra, entende o produto e paga sem falar com você.

### Fase 4 — CRM e funil (3 a 4 semanas)

Entidades de contato, empresa e negócio · funil reusando o `Board` genérico (ADR-004) · vínculo entre negócio e tarefas · histórico de interação

**Pré-requisito:** fase 3 com usuários pagantes. Não construa a fase 4 antes de alguém pedir.

### 12.1 O que não construir antes da hora

Automações condicionais · relatórios gerenciais · integrações além do Google · app nativo · API pública · campos customizados · templates de projeto.

Cada um desses tem justificativa plausível e nenhum deles é o que faz alguém pagar na fase 3.

---

## 13. Métricas

### 13.1 Fase 1 e 2 — produto funciona?

| Métrica                              | Alvo               |
| ------------------------------------ | ------------------ |
| Tarefas criadas por dia útil         | ≥ 5                |
| Tempo do gatilho até a tarefa criada | < 8 segundos       |
| Percentual de tarefas com prazo      | ≥ 70%              |
| Dias consecutivos de uso             | ≥ 10               |
| Tarefas concluídas com atraso        | tendência de queda |

### 13.2 Fase 3 — negócio funciona?

Ativação (cadastro → 5 tarefas criadas em 7 dias) · retenção D7 e D30 · conversão free → pago · tempo até a primeira tarefa · taxa de conexão com o Google Agenda.

### 13.3 Design system

Cobertura de componentes (percentual da UI vinda da biblioteca) · número de tokens de componente (alerta se passar de 80) · componentes com documentação completa · violações de contraste em CI.

---

## 14. Pendências abertas

| #   | Pergunta                                                                         | Bloqueia           |
| --- | -------------------------------------------------------------------------------- | ------------------ |
| P01 | Modo escuro entra na v1 ou depois? Muda o esforço da fase 0                      | tokens             |
| P02 | Idioma: só pt-BR na v1, ou i18n desde o início?                                  | copy e componentes |
| P03 | Recorrência de tarefas: escopo mínimo (diária, semanal, mensal) ou nenhum na v1? | modelo de dados    |
| P04 | Notificações na fase 1: e-mail, push do navegador, ou nenhuma?                   | infra              |
| P05 | Preço e estrutura de planos                                                      | fase 3             |
| P06 | Nome do domínio e disponibilidade da marca "TAFLOW"                         | identidade         |

---

## Apêndice A — Anti-padrões a evitar

**Sistema de design**

- Componentes hipotéticos ("talvez a gente precise de um botão terciário")
- Tokens de componente em excesso — a camada onde sistemas apodrecem
- Meses de design antes do primeiro desenvolvedor envolvido
- Tratar o sistema como projeto paralelo em vez de infraestrutura
- Começar pelo Button — é jogar contra o chefe final primeiro

**UX**

- Lorem ipsum em revisão de design
- WCAG como teto em vez de piso
- Pensar em páginas antes de pensar em componentes
- Formulário de criação com todos os campos possíveis
- Hover como único caminho para uma informação

**Implementação**

- Números mágicos em vez de tokens
- Degradação graciosa em vez de aprimoramento progressivo
- Handoff em mão única em vez de ida e volta contínua
- Sombra em card que está em fluxo

---

## Apêndice B — Checklist antes de cada entrega

- [ ] Todos os estados desenhados: default, hover, focus, active, disabled, loading, erro, vazio
- [ ] Contraste verificado em cada combinação nova
- [ ] Navegação completa por teclado
- [ ] Testado com leitor de tela
- [ ] Responsivo em 1440, 1280, 1024, 768, 375
- [ ] `prefers-reduced-motion` respeitado
- [ ] Testado com conteúdo real, incluindo casos extremos
- [ ] Nenhum valor fora dos tokens
- [ ] Componente documentado no Storybook
- [ ] Estado vazio escrito como convite, não como desculpa
