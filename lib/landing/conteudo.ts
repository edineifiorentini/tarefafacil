/**
 * Todo o texto da landing page, num lugar só.
 *
 * **Cada string aqui saiu do Figma** (arquivo `b1f1cvMXMG4w2HTjE0oJCN`,
 * frame `6:2`). Nada foi escrito de cabeça: preço, número de cliente,
 * depoimento e promessa comercial não aparecem porque não existem no
 * design — e inventá-los seria a forma mais rápida de a página mentir.
 *
 * Fica em dado, e não espalhado em JSX, por dois motivos práticos: a
 * revisão de copy acontece num arquivo só, e as seções ficam sendo
 * layout puro. O `as const` mantém os tipos estreitos sem eu declarar
 * uma interface para cada bloco.
 */

/**
 * Ícone da biblioteca oficial. O arquivo vive em `public/marca/icons`,
 * nas versões `light` (traço grafite) e `dark` (traço nuvem).
 *
 * A união lista os 24 que existem, e não só os que a LP usa hoje: assim
 * um nome errado quebra na compilação em vez de virar um 404 silencioso
 * na página.
 */
export type NomeDeIcone =
  | "approve"
  | "attachment"
  | "billing"
  | "calendar"
  | "chat"
  | "client"
  | "clock"
  | "contract"
  | "delinquency"
  | "filter"
  | "finance"
  | "kanban"
  | "meeting"
  | "notification"
  | "overdue"
  | "recurring"
  | "reject"
  | "report"
  | "review"
  | "search"
  | "sectors"
  | "task"
  | "team"
  | "workflow";

export const WHATSAPP_URL =
  "https://wa.me/5544998245925?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20plano%20sob%20medida%20da%20TAFLOW.";

/** Telefone como o Figma escreve, para leitura humana. */
export const WHATSAPP_LEGIVEL = "(44) 99824-5925";

/** Rotas reais do projeto. Os CTAs saem daqui, nunca de string solta. */
export const ROTA_CADASTRO = "/cadastro";
export const ROTA_LOGIN = "/login";

export const NAV = [
  { rotulo: "Produto", href: "#produto" },
  { rotulo: "Como funciona", href: "#como-funciona" },
  { rotulo: "Recursos", href: "#recursos" },
  { rotulo: "Para quem", href: "#para-quem" },
  { rotulo: "Planos", href: "#planos" },
  { rotulo: "Dúvidas", href: "#duvidas" },
] as const;

export const HERO = {
  eyebrow: "GESTÃO PARA EQUIPES CRIATIVAS",
  /** Duas linhas, como no Figma. A quebra é intencional no desktop. */
  titulo: ["Cresça sem", "perder o fluxo."],
  corpo:
    "Organize demandas, acompanhe sua equipe, aprove trabalhos com clientes e controle contratos e cobranças em um só lugar.",
  ctaPrimario: "Testar grátis por 7 dias",
  ctaSecundario: "Conhecer o fluxo",
  microcopy: "✓ Explore todos os recursos durante 7 dias.",
} as const;

/**
 * O mockup do hero.
 *
 * **Ele mostra o dashboard REAL do TAFLOW**, não uma tela inventada. O
 * Figma trazia "Visão geral" e "Demandas" na barra lateral, que não
 * existem no produto — quem chega pela LP e depois entra no sistema
 * precisa reconhecer a mesma tela. Então os rótulos vêm de
 * `components/dashboard/DashboardView.tsx` e de `components/shell/
 * Sidebar.tsx`: os quatro indicadores são os quatro de lá, na ordem de
 * lá, com o mesmo sparkline, e o gráfico é a "Entrega do mês" com as
 * três séries — entregues, planejadas e atrasadas.
 *
 * Os NÚMEROS continuam sendo exemplo de interface — a página é estática
 * e não consulta banco. Nenhum deles é apresentado como resultado de
 * cliente.
 */
export const MOCKUP = {
  /**
   * O menu COMPLETO do sistema, agrupado como em
   * `components/shell/Sidebar.tsx`: o trabalho do dia em cima e sempre
   * aberto, relatórios soltos, o comercial num grupo que recolhe, e o
   * financeiro no fim porque é dado restrito. Os atalhos são os mesmos
   * que o app aceita — quem vê aqui e entra depois encontra a mesma
   * tecla.
   */
  menu: [
    {
      grupo: null,
      itens: [
        { rotulo: "Dashboard", icone: "dashboard", atalho: "1" },
        { rotulo: "Hoje", icone: "sol", atalho: "2" },
        { rotulo: "Lista", icone: "lista", atalho: "3" },
        { rotulo: "Quadro", icone: "quadro", atalho: "4" },
        { rotulo: "Calendário", icone: "calendario", atalho: "5" },
        { rotulo: "Chat", icone: "chat", atalho: "8" },
      ],
    },
    { grupo: null, itens: [{ rotulo: "Relatórios", icone: "relatorio" }] },
    {
      grupo: "COMERCIAL",
      itens: [
        { rotulo: "Clientes", icone: "clientes", atalho: "6" },
        { rotulo: "Funil", icone: "funil", atalho: "7" },
        { rotulo: "Serviços", icone: "servicos" },
      ],
    },
    {
      grupo: "GESTÃO",
      itens: [
        { rotulo: "Financeiro", icone: "financeiro" },
        { rotulo: "Contratos", icone: "contratos" },
      ],
    },
  ],
  titulo: "Dashboard",
  ajuda: "Seu fluxo, em tempo real.",
  busca: "Buscar...",
  /** Cada indicador tem sparkline no app; a série vai junto. */
  indicadores: [
    {
      nome: "Demandas abertas",
      valor: "24",
      tendencia: "↗ 33.3%",
      sinal: "alta",
      serie: [8, 10, 9, 13, 12, 18, 21, 24],
    },
    {
      nome: "Em produção",
      valor: "11",
      tendencia: "↗ 50%",
      sinal: "alta",
      serie: [4, 5, 5, 7, 6, 9, 10, 11],
    },
    {
      nome: "Atrasadas",
      valor: "2",
      tendencia: "— 0%",
      sinal: "neutro",
      serie: [3, 4, 6, 5, 3, 2, 2, 2],
    },
    {
      nome: "Taxa de conclusão",
      valor: "87%",
      tendencia: "↘ 3 p.p.",
      sinal: "baixa",
      serie: [70, 74, 78, 80, 84, 88, 90, 87],
    },
  ],
  /**
   * "Entrega do mês" com as TRÊS séries do app — entregues, planejadas
   * e atrasadas —, o seletor de mês e a legenda. O gráfico anterior
   * tinha uma linha só, e era justamente o que o dono apontou.
   */
  grafico: {
    titulo: "Entrega do mês",
    periodo: "Setembro de 2026",
    valor: "86",
    unidade: "entregas",
    tendencia: "↗ 18%",
    eixoX: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    series: [
      { nome: "Entregues", cor: "entregue", pontos: [12, 19, 26, 29] },
      { nome: "Planejadas", cor: "planejada", pontos: [18, 22, 28, 34] },
      { nome: "Atrasadas", cor: "atrasada", pontos: [3, 2, 4, 1] },
    ],
  },
  agenda: {
    titulo: "Próximas entregas",
    subtitulo: "Hoje, 2 de setembro",
    itens: [
      {
        hora: "dia",
        tarefa: "Convite e envio",
        setor: "Administração",
        estado: "Em andamento",
      },
      {
        hora: "10:30",
        tarefa: "Campanha de lançamento",
        setor: "Criação",
        estado: "Em andamento",
      },
      {
        hora: "15:00",
        tarefa: "Revisão do institucional",
        setor: "Vídeo",
        estado: "Pendente",
      },
    ],
  },
  aprovacao: {
    titulo: "Aprovado pelo cliente",
    meta: "Agora · Campanha de setembro",
  },
} as const;

export const PUBLICO = {
  titulo: "Para quem transforma demandas em entregas todos os dias.",
  chips: [
    "Agências de marketing",
    "Estúdios de design",
    "Produtoras de vídeo",
    "Equipes criativas",
    "Prestadores de serviços",
    "Times internos",
  ],
} as const;

export const PROBLEMA = {
  eyebrow: "A ROTINA QUE NINGUÉM QUER REPETIR",
  titulo: ["O problema não é ter mais trabalho.", "É perder o fio."],
  intro:
    "Quando operação, cliente e financeiro vivem em lugares diferentes, o crescimento cobra em retrabalho, atraso e falta de clareza.",
  cards: [
    {
      indice: "01",
      icone: "task",
      titulo: "Demandas espalhadas",
      corpo:
        "Briefings, prazos e responsáveis se perdem entre mensagens, planilhas e ferramentas desconectadas.",
      /** Largura da barrinha no rodapé do card, como no Figma. */
      progresso: "92px",
    },
    {
      indice: "02",
      icone: "approve",
      titulo: "Aprovações demoradas",
      corpo:
        "O cliente demora para responder, o histórico some e a equipe não sabe qual versão está valendo.",
      progresso: "344px",
    },
    {
      indice: "03",
      icone: "finance",
      titulo: "Financeiro desconectado",
      corpo:
        "O trabalho é entregue, mas contratos, recorrências e cobranças continuam longe da operação.",
      progresso: "92px",
    },
  ],
  fecho: "TAFLOW conecta o caminho entre a demanda e o resultado.",
  ponte: "VER O FLUXO →",
} as const;

export const FLUXO = {
  eyebrow: "UM SISTEMA, UM FLUXO",
  titulo: "O trabalho não termina no card.",
  corpo:
    "Da primeira solicitação ao recebimento, cada etapa permanece conectada e visível.",
  etapas: [
    {
      numero: "01",
      icone: "task",
      nome: "Demanda",
      descricao: "Briefing e prazo",
    },
    {
      numero: "02",
      icone: "kanban",
      nome: "Produção",
      descricao: "Time e progresso",
    },
    {
      numero: "03",
      icone: "approve",
      nome: "Aprovação",
      descricao: "Feedback do cliente",
    },
    {
      numero: "04",
      icone: "report",
      nome: "Entrega",
      descricao: "Histórico final",
    },
    {
      numero: "05",
      icone: "contract",
      nome: "Contrato",
      descricao: "Acordos e recorrência",
    },
    {
      numero: "06",
      icone: "billing",
      nome: "Cobrança",
      descricao: "Recebimento e status",
    },
  ],
  resultado: {
    primeiro: "Menos troca de contexto.",
    segundo: "Mais decisões no tempo certo.",
    copy: "Um histórico contínuo para equipe, cliente e gestão.",
  },
} as const;

export const PRODUTO = {
  eyebrow: "PRODUTO EM AÇÃO",
  titulo: "Veja o seu negócio avançando.",
  corpo: "Escolha uma etapa do fluxo e acompanhe tudo no mesmo contexto.",
  /** O Figma abre com "Aprovação do cliente" ativa. */
  abaInicial: "aprovacao",
  abas: [
    { id: "demandas", rotulo: "Gestão de demandas" },
    { id: "aprovacao", rotulo: "Aprovação do cliente" },
    { id: "financeiro", rotulo: "Financeiro" },
    { id: "agenda", rotulo: "Agenda" },
    { id: "equipe", rotulo: "Gestão da equipe" },
    { id: "chat", rotulo: "Chat e relatórios" },
  ],
  aprovacao: {
    caminho: "Campanhas / Lançamento / Aprovação",
    situacao: "AGUARDANDO CLIENTE",
    compartilhar: "Compartilhar ↗",
    versoes: {
      titulo: "Versões",
      itens: [
        { versao: "V03", estado: "Atual", data: "Hoje, 10:42" },
        { versao: "V02", estado: "Reprovada", data: "Ontem, 16:10" },
        { versao: "V01", estado: "Revisão", data: "28 ago, 09:24" },
      ],
    },
    telaTitulo: "Campanha de lançamento · peça principal",
    criativo: { eyebrow: "NOVO FLUXO", selo: "APROVAR PEÇA ✓" },
    feedback: {
      titulo: "Feedback do cliente",
      iniciais: "MF",
      autor: "Marina · Cliente",
      quando: "há 12 min",
      comentario:
        "A hierarquia ficou ótima. Podemos só ajustar a data no rodapé?",
      responder: "Responder ao comentário...",
      historicoTitulo: "Histórico preservado",
      historicoCorpo: "A equipe sabe exatamente qual versão está valendo.",
    },
  },
} as const;

export const BENEFICIOS = {
  eyebrow: "IMPACTO NA OPERAÇÃO",
  titulo: ["Clareza para decidir.", "Fluxo para avançar."],
  intro:
    "TAFLOW transforma a rotina em sinais claros para a equipe agir no momento certo.",
  cards: [
    {
      icone: "workflow",
      titulo: "Saiba onde o trabalho parou",
      corpo:
        "Veja tarefas concluídas, próximas do prazo e atrasadas por colaborador e setor.",
    },
    {
      icone: "approve",
      titulo: "Aprove com menos mensagens",
      corpo:
        "Centralize versões, feedbacks, aprovações e pedidos de ajuste com o cliente.",
    },
    {
      icone: "billing",
      titulo: "Cobre o que foi combinado",
      corpo:
        "Conecte contratos, recorrências, cobranças e inadimplência à operação real.",
    },
    {
      icone: "report",
      titulo: "Planeje com informações reais",
      corpo:
        "Identifique gargalos e distribua trabalho com base no que já está acontecendo.",
    },
  ],
  gestor: {
    rotulo: "VISÃO DO GESTOR",
    frase:
      "Encontre o gargalo antes que ele vire atraso, retrabalho ou margem perdida.",
  },
} as const;

export const SEGMENTOS = {
  eyebrow: "PARA QUEM ENTREGA",
  titulo: "Feita para equipes que entregam.",
  intro:
    "Adapte o fluxo à sua operação sem transformar a ferramenta em mais um projeto.",
  cards: [
    {
      iniciais: "AG",
      titulo: "Agências e estúdios",
      corpo:
        "Briefings, criação, revisão do cliente e recorrências no mesmo histórico.",
    },
    {
      iniciais: "PV",
      titulo: "Produtoras de vídeo",
      corpo:
        "Pautas, produção, aprovações de versão e agenda de entregas visíveis.",
    },
    {
      iniciais: "TI",
      titulo: "Times internos",
      corpo:
        "Solicitações de outras áreas, prioridades, capacidade e responsáveis claros.",
    },
    {
      iniciais: "FN",
      titulo: "Freelancers e pequenos negócios",
      corpo:
        "Estrutura profissional para organizar clientes, tarefas, contratos e cobranças.",
    },
  ],
  link: "Ver aplicação →",
} as const;

export const COMECO = {
  eyebrow: "COMECE SEM TRAUMA",
  titulo: "Seu fluxo começa em poucos minutos.",
  intro:
    "A estrutura acompanha a sua operação — pequena hoje, pronta para crescer amanhã.",
  passos: [
    {
      numero: "01",
      titulo: "Crie seu espaço",
      corpo: "Configure empresa, setores e preferências.",
    },
    {
      numero: "02",
      titulo: "Convide sua equipe",
      corpo: "Defina membros, papéis e responsáveis.",
    },
    {
      numero: "03",
      titulo: "Organize o fluxo",
      corpo: "Cadastre clientes, demandas e etapas.",
    },
    {
      numero: "04",
      titulo: "Acompanhe resultados",
      corpo: "Veja prazos, gargalos, contratos e cobranças.",
    },
  ],
  faixa: {
    titulo: "Pronto para colocar o trabalho em movimento?",
    cta: "Criar minha conta",
  },
} as const;

export const PLANOS = {
  eyebrow: "PLANOS QUE ACOMPANHAM O TIME",
  titulo: "Comece pequeno. Cresça no seu ritmo.",
  intro:
    "Todos os planos partem do mesmo fluxo central. A diferença é a capacidade da equipe.",
  selo: "7 DIAS PARA TESTAR O FLUXO",
  destaque: "MAIS ESCOLHIDO",
  cards: [
    {
      id: "essencial",
      nome: "Essencial",
      capacidade: "Para até 3 usuários",
      // TODO(product-rule): confirmar regra antes da publicação — o valor
      // comercial não está definido, e o Figma escreve exatamente isto.
      preco: "Preço a definir",
      itens: [
        "Gestão de tarefas e Kanban",
        "Aprovação e revisão com clientes",
        "Financeiro, contratos e relatórios",
      ],
      cta: "Testar grátis por 7 dias",
      destino: "cadastro",
      recomendado: false,
    },
    {
      id: "equipe",
      nome: "Equipe",
      capacidade: "Para até 10 usuários",
      // TODO(product-rule): confirmar regra antes da publicação.
      preco: "Preço a definir",
      itens: [
        "Gestão de tarefas e Kanban",
        "Aprovação e revisão com clientes",
        "Financeiro, contratos e relatórios",
      ],
      cta: "Testar grátis por 7 dias",
      destino: "cadastro",
      recomendado: true,
    },
    {
      id: "sob-medida",
      nome: "Sob medida",
      capacidade: "Usuários e operação personalizados",
      preco: "Fale com a TAFLOW",
      itens: [
        "Gestão de tarefas e Kanban",
        "Aprovação e revisão com clientes",
        "Implantação orientada ao seu cenário",
      ],
      cta: "Falar no WhatsApp",
      destino: "whatsapp",
      recomendado: false,
    },
  ],
  nota: "Valores comerciais serão inseridos após definição final. Nenhum preço foi presumido neste layout.",
  atendimento: `Atendimento sob medida: ${WHATSAPP_LEGIVEL}`,
} as const;

export const CONFIANCA = {
  eyebrow: "TRABALHO ORGANIZADO",
  titulo: ["Responsabilidade começa", "com contexto."],
  corpo:
    "A TAFLOW reúne histórico, responsabilidades e informações do negócio para reduzir decisões no escuro.",
  cards: [
    {
      icone: "report",
      destaque: true,
      titulo: "Histórico visível",
      corpo: "Versões, comentários e movimentações permanecem no mesmo fluxo.",
    },
    {
      icone: "team",
      destaque: false,
      titulo: "Responsáveis claros",
      corpo: "Equipe, cliente e gestor entendem o próximo passo.",
    },
    {
      icone: "workflow",
      destaque: false,
      titulo: "Negócio conectado",
      corpo: "Operação, contratos e cobranças dividem o mesmo contexto.",
    },
  ],
} as const;

/**
 * FAQ.
 *
 * **O Figma mostra as seis perguntas com as linhas TODAS FECHADAS** — a
 * annotation do componente diz "Collapsed FAQ row" — e não define nenhuma
 * resposta. Escrever resposta comercial de cabeça aqui seria inventar
 * regra de produto, então cada uma sai marcada e some da publicação só
 * quando o dono confirmar.
 */
export const DUVIDAS = {
  eyebrow: "DÚVIDAS FREQUENTES",
  titulo: "Antes de começar, vale saber.",
  intro:
    "As respostas comerciais finais serão alinhadas às regras de lançamento do produto.",
  itens: [
    {
      id: "teste",
      pergunta: "Como funcionam os sete dias de teste?",
      resposta:
        "Você cria a conta e usa o sistema inteiro por sete dias, sem informar forma de pagamento. Nenhum recurso fica bloqueado no período.",
    },
    {
      id: "cartao",
      pergunta: "Preciso cadastrar um cartão?",
      resposta:
        "Não. O cadastro não pede cartão. A forma de pagamento só é escolhida quando os sete dias terminam.",
    },
    {
      id: "depois",
      pergunta: "O que acontece depois do período gratuito?",
      // TODO(product-rule): o gateway do sistema hoje só emite PIX
      // (`lib/billing/gateway.ts` tem `createPixCharge` e mais nada).
      // Boleto e cartão estão prometidos aqui porque são a regra que o
      // dono definiu em 2/set/2026 — mas precisam existir em código
      // antes de o primeiro teste vencer, ou a promessa não se cumpre.
      resposta:
        "Ao fim dos sete dias você escolhe como pagar: boleto, cartão ou Pix. Nada é cobrado antes disso.",
    },
    {
      id: "plano",
      pergunta: "Posso mudar de plano?",
      resposta: "TODO(product-rule): confirmar regra antes da publicação",
    },
    {
      id: "cliente-conta",
      pergunta: "O cliente precisa criar uma conta para aprovar?",
      // Esta o SISTEMA já responde: o link público de demanda (0083) abre
      // sem conta. É comportamento implementado, não promessa comercial.
      resposta:
        "Não. A demanda é compartilhada por um link próprio: o cliente abre, vê o andamento, comenta e aprova sem criar conta.",
    },
    {
      id: "fora-de-marketing",
      pergunta: "A TAFLOW funciona fora de marketing e design?",
      // Idem: o produto é organizado por setores, o que é fato do sistema.
      resposta:
        "Sim. O fluxo é organizado por setores, então qualquer equipe que receba demandas, execute e entregue se encaixa nele.",
    },
  ],
  contato: {
    titulo: "Ainda ficou alguma dúvida?",
    corpo:
      "Converse com a TAFLOW e entenda qual estrutura faz sentido para a sua equipe.",
    cta: "Falar pelo WhatsApp  ↗",
  },
} as const;

export const CTA_FINAL = {
  selo: "7 DIAS PARA SENTIR O FLUXO",
  titulo: [
    "Seu negócio não precisa de mais uma ferramenta.",
    "Precisa de fluxo.",
  ],
  corpo:
    "Comece com a equipe que você tem hoje e ganhe clareza para o próximo passo.",
  ctaPrimario: "Testar grátis por 7 dias",
  ctaSecundario: "Já tenho conta  →",
  nota: "Conheça os recursos antes de escolher o plano.",
} as const;

/**
 * Rodapé.
 *
 * `href: null` marca destino que AINDA NÃO EXISTE no projeto. O link é
 * renderizado como texto, não como âncora morta — link que não leva a
 * lugar nenhum é pior do que link ausente, e some da navegação por
 * teclado. Ver a lista de pendências na entrega.
 */
export const RODAPE = {
  descricao:
    "Tarefas, aprovações e gestão do negócio em um fluxo que a equipe entende.",
  whatsapp: `WhatsApp · ${WHATSAPP_LEGIVEL}`,
  colunas: [
    {
      titulo: "PRODUTO",
      links: [
        { rotulo: "Recursos", href: "#recursos" },
        { rotulo: "Como funciona", href: "#como-funciona" },
        { rotulo: "Planos", href: "#planos" },
        { rotulo: "Entrar", href: ROTA_LOGIN },
      ],
    },
    {
      titulo: "PARA EQUIPES",
      links: [
        { rotulo: "Agências e estúdios", href: "#para-quem" },
        { rotulo: "Produtoras", href: "#para-quem" },
        { rotulo: "Times internos", href: "#para-quem" },
        { rotulo: "Pequenos negócios", href: "#para-quem" },
      ],
    },
    {
      titulo: "EMPRESA",
      links: [
        { rotulo: "Sobre a TAFLOW", href: null },
        { rotulo: "Contato", href: WHATSAPP_URL },
        { rotulo: "Central de ajuda", href: null },
      ],
    },
    {
      titulo: "LEGAL",
      links: [
        { rotulo: "Termos de uso", href: "/termos" },
        { rotulo: "Política de privacidade", href: "/privacidade" },
      ],
    },
  ],
  copyright: "© 2026 TAFLOW. Cresça sem perder o fluxo.",
  dominio: "taflow.com.br",
} as const;
