# Changelog

O que mudou para quem usa o TAFLOW, do mais recente para o mais antigo.

**Este arquivo é escrito à mão, e é de propósito.** O git registra como o
código mudou; um changelog registra o que mudou para a pessoa. Gerar um a
partir de commits produz uma lista em que "corrige o cálculo do ciclo" pesa o
mesmo que "agora dá para conectar outro sistema", e ninguém lê duas vezes.

**O que NÃO entra aqui:** refatoração, correção de build, ajuste de teste e o
painel da plataforma — este último porque só o dono do SaaS o enxerga, e
misturá-lo criaria expectativa de telas que o cliente não vai achar. Ele vive
em `docs/roadmap.md`.

Datas no formato dia/mês/ano.

---

## 31/ago/2026

**Relatórios, no menu principal.** Tela nova que reúne o que estava
espalhado por quatro lugares.

**Por setor** responde como foi o período: quantas demandas entraram,
quantas saíram, quantas saíram no prazo, quantos dias em média da abertura
até a entrega, e quantas estão atrasadas hoje. Período à escolha — 30 dias,
90 dias, este mês ou este ano — e **botão para baixar em CSV**, para levar a
planilha ou a uma apresentação.

Três coisas que o relatório se recusa a fazer, e cada uma tem motivo:

- **demanda sem prazo não entra na pontualidade.** Ela não é pontual nem
  atrasada. Por isso a coluna mostra a base: "100% de 2" deixa claro que só
  duas tinham prazo;
- **onde nada foi entregue aparece um traço, não zero.** Zero significaria
  "entregue no mesmo dia";
- **demanda cancelada não conta** como entrega nem como atraso.

Os dias médios contam **da criação até a conclusão** — é o tempo que o
cliente esperou, não só o de execução. Medir só a execução esconderia a
fila, que costuma ser onde o atraso está.

**Prazos da equipe** virou aba desta tela. O endereço antigo continua
funcionando.

**Prazos da equipe, para quem lidera.** Tela nova em **Equipe**, na barra
lateral. Ela responde de relance quem está com o quê atrasado — e, o que
faltava, **o que ainda está para vencer**.

Até agora o sistema avisava o gestor só depois que a demanda atrasava. O
prazo que ainda dava para cumprir só chegava a quem ia entregar, e é
justamente esse que ainda dá para salvar.

Cada setor pode ter um **gestor**, escolhido em Editar setor. Ele passa a
ver os prazos daquele setor e continua sem acesso ao Financeiro — ser gestor
não é ser administrador. Quem não gerencia nada não vê a tela.

Demanda **sem responsável** aparece no topo do relatório, num grupo próprio.
É a que ninguém assumiu, e por isso a que ninguém lembra de cobrar.

**O cliente agora vê a peça no link.** Antes ele aprovava ou pedia ajuste
sem o criativo na tela — tinha visto por WhatsApp, e o link só mostrava o
andamento.

Cada arquivo é liberado **um a um**: no anexo da demanda há um botão de olho
que o marca como entregável. Sem marcar, nada sai — o contrato e a planilha
de custo continuam onde estavam. O cliente vê a imagem; o arquivo original
não é oferecido para download.

**Excluir cliente e arquivar projeto.** As duas ações existiam por dentro e
não tinham botão.

Excluir cliente **recusa quando há contrato**. Contrato é documento com o
texto congelado no momento da assinatura, e apagar o cliente apagaria os
contratos dele junto, para sempre. Para encerrar a relação sem perder nada,
mude a situação do cliente para **Encerrado**.

Sem contrato, o aviso diz o que vai junto e o que fica: negociação do funil
é apagada; demanda e lançamento continuam no sistema, sem o vínculo.

Arquivar projeto tira ele das listas e **não apaga demanda nenhuma** — elas
continuam onde estão. O aviso traz **Desfazer**, porque projeto arquivado não
aparece em lista e um clique errado não deve custar um caminho de volta.

**O produto agora se chama TAFLOW — Gestão que flui.** Era TarefaFácil. O
nome mudou nas telas, nos documentos e no endereço do produto; nada do que
você cadastrou muda de lugar.

Uma consequência prática para quem integra: os cabeçalhos assinados do
webhook passaram de `x-tarefafacil-*` para **`x-taflow-*`**. Se você já
conferia a assinatura, ajuste o nome do cabeçalho. A conta da assinatura em
si não mudou.

**A logo da empresa no lugar do nome.** Em Configurações → Geral, quem
administra sobe a logo e ela passa a aparecer na barra lateral, onde antes
ficava o nome escrito. Completa a escolha de cor que saiu em 27/ago.

A imagem é **convertida para WebP e reduzida** no envio — não precisa
preparar arquivo leve, pode mandar o PNG que veio do designer. PNG, WebP ou
JPEG; SVG não é aceito.

Ela não é cortada. Logo já vem na proporção que alguém desenhou, e recortá-la
num quadrado a estragaria: o sistema encaixa a imagem inteira, deitada ou em
pé, com um teto de altura para nenhuma delas esticar a barra.

No **tema escuro** a logo ganha uma placa clara atrás. É o que faz marca
escrita em cor escura continuar legível sem pedir uma segunda versão do
arquivo.

**Empresa sem logo mostra a marca do TAFLOW** na barra lateral.

Duas exceções, e as duas são de propósito. No **contrato impresso** aparece o
nome da empresa, nunca a nossa marca: aquele cabeçalho identifica a parte
contratada, e um documento jurídico de terceiro não leva a marca do
fornecedor de software. No **seletor de empresas**, quem não tem logo aparece
pelo nome — se todas mostrassem a mesma marca padrão, a lista deixaria de
distinguir uma da outra.

---

## 28/ago/2026

**Webhook avisa também de comentário e projeto.** Os dois eventos existiam no
catálogo e nunca disparavam — quem se inscrevesse não recebia nada e não tinha
como descobrir por quê.

O **texto** do comentário não vai no aviso: só que houve comentário, em qual
demanda e de quem. Conversa da equipe não sai do sistema.

---

## 27/ago/2026

**Chave de API por empresa.** Em Configurações → Integrações, quem é dono gera
uma chave para o próprio sistema conversar com o TAFLOW. A chave aparece
uma vez só — o sistema guarda apenas um resumo criptográfico dela. Até dez
ativas, revogáveis a qualquer momento.

**Webhooks de saída.** Em vez de o sistema do cliente perguntar "mudou alguma
coisa?", o TAFLOW avisa. Oito eventos: demanda criada, movida de coluna,
concluída, reaberta, atribuída, excluída; comentário criado; projeto criado.

Cada aviso vai assinado, para o destino confirmar a origem. A mesma tela mostra
o registro das entregas — o que saiu, para onde, e o que o destino respondeu.
Destino fora do ar recebe novas tentativas ao longo do dia antes de a entrega
ser dada como perdida.

Marcar item de subtarefa **não** gera aviso: subtarefa é conferência dentro de
uma demanda, não um compromisso próprio, e cada marcação viraria ruído na
integração de alguém.

**Cada empresa escolhe a cor da marca.** Sete opções em Configurações → Geral:
azul, índigo, lilás, teal, verde, magenta e grafite. Vale no sistema inteiro,
nos modos claro e escuro, e acompanha a pessoa entre dispositivos.

Um aviso sobre o verde: no sistema ele significa dinheiro positivo. Escolhendo
verde de marca, essa distinção fica menos evidente nas telas de financeiro.

**Correção — espaço no topo da tela Hoje.** O primeiro cartão encostava na
borda e parecia cortado ao rolar. A folga estava acima da área de rolagem e
sumia no primeiro pixel de scroll.

---

## 26/ago/2026

**A tela Hoje virou central de ação.** Ela era limpa demais e sobrava espaço.
Agora usa a largura toda e responde de relance o que precisa de atenção:

- quatro números no topo — atrasadas, para hoje, sem data, concluídas — e cada
  um filtra a lista ao ser clicado;
- **Prioridades** com abas: atrasadas, para hoje, próximos sete dias, sem data;
- **Distribuição das pendências** por setor e por responsável, que é onde se vê
  uma pessoa carregando o time sozinha;
- **Próximos dias**, com o que vence na semana.

---

## 25/ago/2026

**Foto de perfil, com recorte.** Imagem fora do quadrado abre um editor com
máscara redonda antes de subir.

**Senha de acesso para quem entrou pelo Google.** Dá para definir uma senha e
passar a entrar dos dois jeitos.

**Demanda sem data aparece em Hoje.** Antes ficava só na lista, onde era
esquecida. Agora entra em "sem data definida", para ser priorizada.

---

## 24/ago/2026

**Conta de recebimento por empresa.** Mercado Pago e Asaas, com a credencial
conferida junto ao provedor antes de ser salva — chave errada é recusada na
hora, em vez de falhar no dia de receber.

**Aba de integrações**, com as conexões agrupadas por assunto.

**Cliente aprova ou pede ajuste pelo link público**, sem precisar de conta.

**Cadastro com login e senha**, além do Google, com termos de uso e política de
privacidade.

---

## 21/ago/2026

**Funil de vendas.** O quadro de arrastar passou a servir também ao comercial.

**Catálogo de serviços**, com consulta automática de CEP e CNPJ no cadastro.

**Teste de sete dias** para contas novas, e **vencidos em destaque** no
Financeiro.

**Chat ganhou reação de emoji e recado de voz.**

**Configurações em abas.** Era uma página só, empilhada; agora cada aba é um
assunto.

**Correção de segurança:** o dono do workspace conseguia registrar uma venda
para si mesmo.

---

## 20/ago/2026

**Anexo em mensagem do chat.**

---

## 19/ago/2026

**Anexo apagado some do armazenamento de verdade**, e uma varredura semanal
recolhe arquivos órfãos — documento que a pessoa achou que apagou não fica
guardado.

Correções de seleção nas listas e distinção entre a caixa de selecionar e a de
concluir, que estavam parecidas demais.

---

## 18/ago/2026

**Link público revogável para uma demanda**, para mostrar andamento a quem não
tem conta.

**Lançamentos recorrentes no Financeiro**, com edição por alcance: só este, os
próximos, ou todos.

**Trilha de auditoria do workspace** — quem mudou o quê e quando.

**Chat reorganizado:** um canal Geral, grupos e conversas diretas, com setor
como etiqueta. A versão anterior criava um canal por setor, o que partia a
conversa em doze salas que ninguém acompanhava.

**Aviso flutuante ao criar tarefa**, com desfazer.

**Toda demanda passou a pertencer a um setor**, e todo workspace nasce com o
setor "Geral" para ninguém ficar preso em zero.

---

## 17/ago/2026

**Chat interno da equipe.**

**Central de notificações**, com preferências por tipo.

**Contratos: modelos com variáveis**, e o texto congelado no momento da
assinatura — mudar o modelo depois não reescreve contrato já fechado.

---

## 15/ago/2026

**Contratos: as duas partes**, contratante e contratada, com vigência.

---

## 14/ago/2026

**Redesenho visual.** Pearl claro, minimalista, com azul e lilás como
assinatura e vidro aplicado só onde ajuda — casca lateral, busca, menus e
modais. Card de dado continua sólido: legibilidade vem antes do efeito.

**Módulo Financeiro:** lançamentos, indicadores, fluxo de caixa, meta e notas
fiscais.

**Módulo Contratos**, ligado ao Financeiro — o contrato gera as parcelas.

**Dashboard** com indicadores gerenciais.

**Pomodoro por demanda**, que continua contando ao trocar de tela, com aviso
nativo ao terminar.

**Demandas mais fundas:** cancelamento, prioridade em cinco níveis, tipo de
demanda, participantes, limite de trabalho em progresso, comentários, registro
de tempo, dependências e ações em lote na visão Lista.

**Painel da demanda em abas**, e máscara de moeda ao digitar valores.

**Sino de pedidos de entrada** no topo, para aceitar ou recusar quem pede
acesso.

---

## 13/ago/2026

**Módulo Clientes (CRM)**, com vínculo entre cliente e demanda.

**Convite exige aprovação do dono.** Sem isso, quem tivesse o link entrava
sozinho.

**Painel de clientes** com bloquear, renovar e remover.

---

## 12/ago/2026

**Colunas personalizáveis no Kanban.**

**Tempo de acesso por workspace**, base dos planos por período.

**Link do Google Meet na reunião**, com botão de copiar.

**Tema claro e escuro**, com etiquetas e progresso nos cartões do quadro.

**Convite entra no workspace certo** e respeita o limite de assentos.

---

## 11/ago/2026

**Seletor de workspace** — o multi-tenant passou a ser utilizável.

**Horário de início e fim na tarefa.** Sem hora é dia inteiro; só início
reserva trinta minutos; início e fim reservam o intervalo. Vale nos dois
sentidos da sincronização com o Google.

---

## 07–10/ago/2026

Base do produto: setores, demandas com criação rápida, painel de detalhe,
quadro Kanban, visão Hoje, autenticação e workspace.

---

## O que não está aqui

O painel da plataforma, o motor de cobrança do SaaS e o webhook de pagamento
são ferramentas do dono do produto, invisíveis para quem usa o TAFLOW.
Estão registrados em `docs/roadmap.md`.

**Correções de segurança aparecem neste arquivo** quando a pessoa precisa saber
que algo mudou — como o caso de 21/ago. Falha que não exigiu ação de ninguém e
não mudou comportamento fica fora: divulgar o mapa de uma porta que já foi
fechada só ajuda quem chegou tarde.
