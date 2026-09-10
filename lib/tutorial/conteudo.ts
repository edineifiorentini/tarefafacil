/**
 * O que o tutorial ensina — e, principalmente, o que ele NÃO ensina.
 *
 * **Escopo decidido pelo dono em 10/set/2026: só o que não é evidente.** Uma
 * lista de tarefas não precisa de legenda; quem abriu o sistema já sabe que
 * clicar num item abre o item. O que ninguém descobre sozinho são as regras
 * de produto — que subtarefa não vira compromisso na agenda, que publicar é
 * ato explícito, que o espaço é da empresa e não do arquivo. Essas decisões
 * têm motivo, e o motivo é justamente o que uma tela não consegue dizer.
 *
 * **O texto mora aqui, e não dentro do componente**, pelo mesmo motivo de
 * `lib/landing/conteudo.ts`: escrever é uma tarefa, desenhar é outra, e
 * quem for revisar a redação não deveria precisar atravessar JSX para
 * encontrar uma frase.
 *
 * **Cada passo aponta para onde a coisa acontece.** Um tutorial que explica
 * sem levar deixa a pessoa lendo sobre um lugar que ela não sabe achar.
 */

export type PassoDoTutorial = {
  id: string;
  titulo: string;
  /** A frase que resume. Aparece na lista lateral, sob o título. */
  resumo: string;
  /** Os parágrafos. Texto puro — nada aqui interpreta marcação. */
  corpo: string[];
  /** Para onde ir para ver isso funcionando, quando existe um lugar. */
  destino?: { rotulo: string; href: string };
};

export const PASSOS: PassoDoTutorial[] = [
  {
    id: "boas-vindas",
    titulo: "Como este sistema pensa",
    resumo: "Cinco minutos que economizam meses",
    corpo: [
      "O TAFLOW organiza demandas de quem atende cliente: o trabalho entra, passa por etapas, vira material, e o cliente aprova ou pede ajuste.",
      "Este guia não explica botão por botão — a tela faz isso sozinha. Ele explica as decisões que estão por trás e que ninguém adivinha, porque são elas que fazem o sistema parecer teimoso quando você não as conhece.",
      "Dá para fechar a qualquer momento. O botão de interrogação, ao lado da busca, traz este guia de volta quando você quiser.",
    ],
  },
  {
    id: "setor-projeto-cliente",
    titulo: "Setor, projeto e cliente",
    resumo: "Três agrupamentos diferentes, e o mais confundido",
    corpo: [
      "Setor é de quem faz: social media, audiovisual, atendimento. Toda demanda pertence a um, sem exceção — é por ele que a barra lateral, o quadro e o chat se organizam. Uma empresa nova já nasce com o setor Geral para ninguém ficar preso em zero.",
      "Projeto é um pacote com começo e fim: uma campanha, um lançamento, uma reforma de site. Junta demandas de setores diferentes sob o mesmo guarda-chuva.",
      "Cliente é para quem o trabalho é feito. Uma demanda pode não ter projeto e não ter cliente — mas nunca deixa de ter setor.",
    ],
    destino: { rotulo: "Ver os setores", href: "/quadro" },
  },
  {
    id: "aprovacao",
    titulo: "O ciclo de aprovação",
    resumo: "Enviar não é publicar, e versão é linha nova",
    corpo: [
      "Na aba Aprovação de cada demanda, o arquivo que você envia entra como RASCUNHO. O cliente não vê nada até você revisar, escrever um recado e apertar publicar. Foi feito assim de propósito: marcar e pronto era um passo a menos e um acidente a mais.",
      "Quando o cliente pede ajuste, você sobe a correção como versão nova — v02 — e publica no lugar. A v01 continua na tela, com o que ele escreveu sobre ela. É esse rastro que explica por que existe uma v02.",
      "A resposta do cliente fica amarrada à VERSÃO que ele analisou. Aprovou a v01, o registro fica na v01: subir a v02 faz a demanda voltar a aguardar, em vez de herdar um aprovado que ninguém deu a ela.",
    ],
  },
  {
    id: "link-do-cliente",
    titulo: "O link do cliente",
    resumo: "O que sai da sua casa, e o que fica",
    corpo: [
      "O link é uma página pública, sem senha, com prazo de validade. Quem recebe vê o título, a situação, o prazo, o responsável, as etapas e os materiais que você publicou.",
      "O que NÃO sai: comentários da equipe, tempo registrado, valores, anexos internos e as outras demandas do cliente. O briefing, o contrato e a planilha de custo ficam na aba Trabalho e não atravessam essa porta.",
      "O cliente aprova ou pede ajuste ali mesmo, e quem responde pela demanda é avisado na hora. Você pode revogar o link quando quiser.",
    ],
  },
  {
    id: "subtarefas",
    titulo: "Subtarefa não vira compromisso",
    resumo: "Item de conferência, não evento",
    corpo: [
      "Subtarefa é lista de conferência dentro de uma demanda. Ela não gera evento no Google Agenda, não dispara webhook e não sai para lugar nenhum.",
      "O motivo: cada marcação viraria ruído na agenda de alguém. Quem representa a demanda para fora é a demanda inteira, com um prazo só.",
    ],
  },
  {
    id: "google",
    titulo: "Google Agenda é por demanda",
    resumo: "Ligado uma a uma, nunca em bloco",
    corpo: [
      "Conectar sua conta do Google não sincroniza nada sozinho. Cada demanda tem um interruptor próprio, desligado por padrão.",
      "É deliberado: sincronizar tudo encheria a agenda de quem só queria acompanhar três entregas. Você escolhe quais merecem virar compromisso.",
      "A sincronia vale nos dois sentidos — mudar a data no Google muda aqui, e o contrário também.",
    ],
    destino: { rotulo: "Conectar o Google", href: "/config" },
  },
  {
    id: "espaco",
    titulo: "O espaço é da empresa",
    resumo: "E o link do Drive é a saída",
    corpo: [
      "A cota de arquivos é da empresa inteira, não de cada arquivo ou de cada pessoa. A barra que aparece ao anexar mostra quanto já foi usado.",
      "Material de aprovação sai do servidor 30 dias depois de aprovado, ou 45 sem resposta — o registro do que aconteceu fica, e o cliente lê uma explicação no lugar do arquivo. Anexo interno não tem prazo.",
      "Bateu no limite, ou o arquivo é grande demais? Cole um link do Drive. Ele não ocupa espaço nosso e nunca é apagado — mas a permissão de quem abre é você que controla lá, não aqui.",
    ],
  },
  {
    id: "hoje-e-fuso",
    titulo: "O que 'hoje' quer dizer",
    resumo: "Depende do fuso que você escolheu",
    corpo: [
      "Hoje, vence hoje e atrasada dependem de onde a virada do dia acontece — e o Brasil tem quatro fusos. O sistema usa o fuso salvo na sua conta, não o relógio do aparelho.",
      "Isso importa em computador emprestado ou aparelho que voltou de viagem: a sua escolha continua valendo. Trocar é em Configurações, na aba Conta.",
    ],
    destino: { rotulo: "Ver minhas preferências", href: "/config" },
  },
];
