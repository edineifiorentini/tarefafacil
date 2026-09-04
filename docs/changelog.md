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

## 4/set/2026

**Agora dá para escolher seu fuso horário.** Em Configurações → Conta. Ele
define o que "hoje", "vence hoje" e "atrasada" querem dizer para você — e o
Brasil tem quatro fusos, então quem trabalha em Manaus, Rio Branco ou
Fernando de Noronha via a virada do dia pelo horário de Brasília.

A lista começa pelos fusos do país, com o lugar escrito por extenso — "Rio
Branco (Acre)", e não só o nome técnico. Se o seu computador ou celular
estiver num fuso diferente do escolhido, aparece um atalho para usar o do
aparelho. **A sua escolha continua valendo** ao abrir num computador
emprestado ou num aparelho que voltou de viagem: o aparelho sugere, você
decide.

**Uma conta que estava errada no servidor.** No relatório de etapas, "parada
há N dias" podia mostrar um dia a menos para demandas que mudaram de etapa
no fim da noite. O servidor calculava a virada do dia pelo horário de
Londres, não pelo do Brasil.

**Áudio e vídeo passaram a ser aceitos para aprovação.** MP3 era recusado —
o sistema não reconhecia o formato e devolvia "tipo de arquivo não
permitido". Agora entra, e toca dentro da página do cliente, com o tempo
total aparecendo antes de dar play. Vídeo já entrava, mas tinha um defeito:
enviado de certas origens, era guardado como se fosse áudio e abria num
player sem imagem. Corrigido.

**O limite deixou de ser por arquivo e passou a ser por empresa.** Antes
cada arquivo tinha um teto e o total era livre — o que barrava um vídeo de
campanha legítimo e não dizia nada sobre quem sobe mil imagens. Agora cada
empresa tem **1 GB de espaço no servidor**. O aviso aparece na tela de
anexos quando você chega perto, com quanto já usou.

**A saída para quem precisa de mais é o Google Drive.** Arquivo que está no
Drive não ocupa espaço aqui — cole o link no campo de anexos em vez de
enviar o arquivo, e o espaço passa a ser o da sua conta do Drive. Link do
Drive também nunca é apagado por prazo: o arquivo é seu, não nosso.

**Arquivo de aprovação tem prazo no servidor, e é de propósito.** O TAFLOW é
gestão de demanda, não um lugar para arquivar. Depois de aprovado, o
material fica **30 dias** — tempo de ir para a gráfica ou para as redes. Se
ninguém responder, ele sai em **45 dias**. Quando isso acontece, o link do
cliente não quebra: ele passa a mostrar a data em que o arquivo saiu e o que
fazer. **Anexo interno não tem prazo** — briefing, referência e captura de
tela ficam.

**Só quem administra a empresa conecta ou desconecta o Google.** A conta do
Google é uma só para a empresa inteira, e qualquer pessoa da equipe podia
trocá-la — ou desconectar, o que desliga a sincronização de todas as
demandas de uma vez. Agora isso é de administrador.

**A tela que o seu cliente abre foi refeita.** Aquele link que você manda
para aprovar um material saía numa página de uma coluna, com o nome dos
arquivos escritos em lista e dois botões embaixo. Ela funcionava, e não
parecia o lugar onde alguém assina embaixo.

**Agora o material aparece.** Imagem, vídeo, áudio e PDF abrem dentro da
página, com zoom, encaixe na tela e tela cheia. Mandou mais de um arquivo?
Eles viram abas no topo da prévia, e o cliente passa de um para o outro sem
sair do lugar.

**Do lado, o contexto:** quem é o responsável pela demanda, o que foi
pedido, quais arquivos foram enviados e em que pé está o trabalho.

**As etapas viraram um caminho.** Antes eram três bolinhas soltas, uma em
cima da outra — parecia que o cliente precisava escolher uma. Agora há uma
linha ligando etapa a etapa, com a marcação do que já foi feito, do que está
em andamento e do que ainda vem. Ele não clica em nada ali: é só para saber
onde a demanda está.

**Aprovar pede confirmação.** É a única coisa na página que não tem volta, e
a confirmação diz exatamente o que vai ser aprovado. Quando a demanda tem
mais de um material, ela avisa que a aprovação vale para todos — e não só
para o que está na tela.

**O arquivo original continua não saindo dali.** O cliente vê a peça; o que
não sai é o arquivo de origem — o PSD em camadas, o master em alta. Vale
dizer com todas as letras: **quem vê uma imagem consegue salvá-la**, e
nenhuma tela do mundo muda isso. O que o TAFLOW garante é que o endereço do
seu arquivo no armazenamento nunca chega ao navegador de quem abriu o link,
e que cada abertura passa por uma checagem do link antes de mostrar
qualquer coisa.

**A sua marca aparece no topo.** Se a empresa tem logo cadastrada, é a dela
que o cliente vê. Se não tem, aparece a do TAFLOW. E ela era invisível para
uma parte das pessoas: quem estivesse com o celular ou o computador no modo
claro recebia a escrita em grafite sobre a página escura, e enxergava só o
detalhe verde. Corrigido.

**Uma coisa que talvez você não saiba, e muda o que o seu cliente vê:** a
prévia só mostra o que estiver **marcado como entregável** na demanda.
Anexo comum não aparece — é de propósito, para contrato e planilha de custo
não irem junto por engano. Hoje não há nenhum arquivo marcado assim no
sistema, o que significa que todo link aberto agora mostra "este material
ainda não possui uma prévia". Marque o arquivo na demanda e ele passa a
aparecer.

**O que ainda não existe, para não haver surpresa:** o TAFLOW não guarda
versões de um arquivo — mandar uma peça nova é mandar um anexo novo. Por
isso a página não numera versões, não mostra histórico e ainda não libera o
download depois da aprovação. As três coisas dependem da mesma peça, e ela
vem junto.

## 3/set/2026

**Três respostas sobre pagamento que estavam em aberto.** Elas apareciam
como pendentes no FAQ da página inicial desde que ela entrou no ar. Agora
estão escritas, e valem:

- **o cadastro não pede cartão.** Você cria a conta e usa o sistema
  inteiro por sete dias sem informar forma de pagamento nenhuma. Nenhum
  recurso fica bloqueado no período;
- **ao fim dos sete dias você escolhe como pagar: boleto, cartão ou
  Pix.** Nada é cobrado antes disso;
- **dá para mudar de plano a qualquer momento.** A troca passa a valer na
  virada do próximo ciclo, então você não paga dois planos no mesmo mês.

Continuam em aberto, e vale saber: **os preços ainda não estão
publicados** e as páginas "Sobre" e "Central de ajuda" ainda não existem.

**Quem testou o TAFLOW antes de ele ter preço não paga.** Se você está
entre as primeiras empresas do sistema, seu acesso é vitalício e sem
cobrança — não tem data para vencer e não vai gerar fatura.

Uma consequência prática, e ela vale **só para quem está no vitalício**:
a tela de planos não deixa trocar sozinho. Se tentar, ela avisa e pede
para falar com a gente antes. É de propósito — o vitalício não aparece na
lista para se voltar a ele, então sair por um clique curioso seria perder
algo que não volta. Nos demais planos a troca continua livre, como está
dito acima.

**A Lista foi refeita.** Ela abre em **Em aberto**, e não mais numa
mistura em que as concluídas ocupavam a maior parte da tela. As
concluídas continuam ali, recolhidas no fim, atrás de um botão que diz
quantas são.

**Seis atalhos no topo, com a contagem de cada um:** em aberto,
atrasadas, para hoje, esta semana, sem responsável e concluídas. Os
números respeitam os filtros — se você filtrou um setor, "Atrasadas 4"
quer dizer quatro naquele setor.

**Colunas de verdade, com cabeçalho.** Demanda, status, setor,
responsável e prazo, alinhados de uma linha para a outra. O status é a
coluna do seu quadro — "Em produção", "Em aprovação", o que você mesmo
criou. O setor agora aparece com o NOME ao lado da bolinha colorida.

**Concluir e selecionar deixaram de ser a mesma coisa.** Antes, a
bolinha de concluir e a caixa de seleção dividiam o mesmo canto da linha,
e era fácil fazer uma querendo a outra. Agora a seleção só existe quando
você clica em "Selecionar", e enquanto ela está ligada é ela que ocupa o
lugar — um controle por linha, sempre.

**Datas que dizem a verdade.** Uma demanda entregue com atraso deixou de
aparecer em vermelho como se ainda estivesse pendente: agora ela diz
"Concluída com 3 dias de atraso". Demanda cancelada não mostra mais prazo
— ela saiu do fluxo. E demanda sem prazo diz "Sem prazo" em vez de deixar
a coluna vazia.

Os prazos passaram a falar em linguagem de gente: "Hoje, 15h", "Amanhã",
"Em 3 dias", "Atrasada há 2 dias". Passe o cursor para ver a data por
extenso.

**Os filtros agora aparecem.** Em vez de cinco campos dizendo "Todas",
há um botão "Filtros" com a contagem do que está ligado, e logo abaixo um
chip para cada filtro ativo — cada um com o seu X. "Limpar" some tudo de
uma vez, mas não apaga o que você digitou na busca.

**A busca procura por título, cliente, setor e responsável**, não só pelo
título.

**Agrupar e ordenar dizem o que estão fazendo.** "Agrupar: Nenhum",
"Ordenar: Prazo mais próximo". E "prazo mais próximo" agora ordena por
urgência de verdade: atrasadas primeiro, depois o que vence hoje, depois
o futuro, e as sem prazo por último.

**O endereço guarda o recorte.** Filtrou, agrupou, ordenou? A barra do
navegador guarda tudo. Isso significa três coisas: dá para mandar a lista
para alguém por link, o F5 não perde nada, e **fechar uma demanda devolve
exatamente a lista de onde você saiu**.

**Salvar visualização.** Montou um recorte que usa toda semana? Dê um
nome e ele fica guardado. Uma limitação para saber: ele fica no navegador
em que você salvou, e ainda não acompanha para o celular.

**Ações em lote.** Com demandas selecionadas, aparece uma barra no rodapé
para concluir, cancelar, mover de setor ou excluir várias de uma vez.
Excluir pede confirmação — e sugere cancelar, que preserva o histórico.

**No hover da linha:** abrir a demanda e editar o prazo, sem precisar do
menu.

**Relatórios responde primeiro se está tudo bem, e só depois mostra a
tabela.** A tela abria numa lista de números por setor — boa para
conferir, ruim para decidir. Agora ela abre numa **Visão geral** com
cinco indicadores no topo: demandas criadas, entregues, percentual no
prazo, atrasadas agora e tempo médio de ciclo.

**Cada número diz como foi calculado.** Passe o cursor no ícone ao lado
do rótulo. É proposital: "79% no prazo" pode significar coisas muito
diferentes, e aqui significa uma só — entregues até a data combinada,
dividido pelas que TINHAM data combinada. Demanda sem prazo não entra
na conta, nem como acerto nem como erro.

**Duas coisas que pareciam a mesma e não são.** "Atrasadas" conta o que
está vencido e ainda aberto — o que dá para salvar hoje. Uma demanda
entregue com três dias de atraso não aparece ali; ela entra na
pontualidade, que é história. Somar as duas dava um número que não
respondia a pergunta nenhuma.

**Gráfico de fluxo: quanto entrou contra quanto saiu.** Quando as duas
linhas se afastam, a fila está crescendo — e dá para ver em qual semana
começou. O saldo aparece ao passar o cursor.

**Risco de prazo, em três grupos.** No prazo, em atenção (vence nos
próximos 7 dias) e atrasadas. As demandas sem prazo aparecem à parte,
por escrito: elas não estão "no prazo", estão sem prazo.

**Gargalos do fluxo.** Mostra em qual coluna do seu quadro as demandas
abertas estão paradas, e há quantos dias. As etapas são as suas colunas
de verdade — nada é inventado. Quando uma etapa concentra a maior parte
da espera, a tela diz isso em uma frase.

**Dá para investigar qualquer número.** Clique em "4 atrasadas" e a
Lista abre com as quatro. Clique num setor e a tela inteira passa a
falar só dele.

**Filtros que valem para tudo, e que cabem num link.** Período (agora
com "Últimos 7 dias", "Mês anterior", "Este trimestre" e período
personalizado), setor e responsável comandam todos os blocos. O
endereço guarda o que você escolheu: mandar o relatório para alguém é
copiar a barra do navegador.

**Comparar período.** Ligue o interruptor e cada indicador mostra a
variação em relação ao intervalo anterior de mesma duração. Quando não
há base para comparar, ele diz "Sem base para comparação" — nunca
inventa um crescimento de 100% porque o mês anterior estava vazio.

**A tabela continua, e ganhou colunas.** Em andamento, atrasadas e uma
coluna de Risco (Saudável, Atenção ou Crítico) que explica o motivo ao
passar o cursor. Dá para buscar setor, escolher quais colunas ver e
ordenar por qualquer uma delas.

**"Prazos da equipe" virou "Prazos e equipe"**, com o volume concluído,
a pontualidade e o tempo médio de cada pessoa no período — ao lado da
carga e dos prazos que já estavam lá.

**Exportar respeita o que está na tela.** O arquivo sai com o período,
os setores e os responsáveis escritos no topo, e traz todas as linhas —
não só a página visível.

---

## 2/set/2026

**O TAFLOW tem endereço próprio: [taflow.com.br](https://taflow.com.br).**
É a mudança mais importante desta versão.

Até agora o sistema morava num endereço da Vercel — aquele terminado em
`.vercel.app`, que servia para desenvolver e nunca para mostrar a
cliente. Agora ele atende no domínio do produto. Digitar com ou sem
`www` dá no mesmo: quem chega pela raiz é levado para `www` sozinho.

**O endereço antigo não responde mais.** Se você o tinha salvo nos
favoritos, no atalho da área de trabalho ou anotado em algum lugar,
troque por `taflow.com.br` — o antigo devolve página não encontrada, não
um aviso. Vale conferir também no celular de quem usa o sistema pelo
navegador.

Uma consequência que talvez você encontre: **quem já tinha conectado o
Google Agenda pode precisar conectar de novo.** A autorização do Google
é amarrada ao endereço, e o endereço mudou. Se a agenda parar de
sincronizar, é só reconectar em Configurações.

**Página inicial nova.** Quem abre `taflow.com.br` sem estar logado
agora encontra uma apresentação do produto, e não mais a tela de entrar
direto. Ela conta o que o TAFLOW faz — do briefing à cobrança —, mostra
a interface funcionando, responde as dúvidas mais comuns e leva ao teste
de sete dias.

Quem já usa o sistema não perde nada: com a sessão aberta, o endereço
continua caindo direto no seu dia de trabalho, como sempre.

Três coisas ainda estão em aberto nessa página, e vale saber antes que
alguém pergunte: **os preços não estão publicados** (aparecem como "Preço
a definir", porque ainda não foram definidos), **quatro respostas do FAQ
estão marcadas como pendentes** e **as páginas "Sobre" e "Central de
ajuda" ainda não existem** — no rodapé elas aparecem sem link, em vez de
levar a lugar nenhum.

> As quatro respostas do FAQ foram escritas no dia seguinte — estão no
> alto desta página. Os preços e as duas páginas continuam em aberto.

**Quem entrava pelo Google não conseguia terminar o cadastro.** Depois de
autorizar a conta, a tela "Falta pouco" — a que pede nome e CPF/CNPJ —
simplesmente não carregava. E não havia saída: enquanto o cadastro não
fechava, o sistema mandava de volta para a mesma tela quebrada. Corrigido.

Quem ficou parado nisso: entre de novo e a tela vai aparecer normalmente.
Nenhum dado foi perdido — a conta já estava criada, faltava só o último
passo.

**Os setores agora recolhem na barra lateral.** Quem tem muitos setores
via a lista empurrar Configurações e Sair para fora da tela. Agora existe
uma setinha ao lado de "Setores": clique e a lista fecha, deixando o
número de setores à vista para você saber que eles continuam ali.

O sistema lembra da sua escolha — ela vale no computador em que você
clicou, e continua valendo depois de fechar o navegador.

**Compartilhar o link do TAFLOW agora mostra uma prévia.** Antes, colar
`taflow.com.br` no WhatsApp, no LinkedIn ou no e-mail produzia um link
seco. Agora aparece um cartão com a marca, a frase do produto e o
endereço. Se você já compartilhou o link antes e ainda vê o formato
antigo, é o cache de quem recebeu — some sozinho.

**Tela de entrar nova.** A porta de entrada agora tem dois lados: à
esquerda o painel da marca, em grafite, com a frase do produto; à direita o
formulário, sobre fundo claro. Entre os dois passa uma curva verde — é o
traço do "fl" da nossa marca, esticado de cima a baixo.

O que mudou para quem entra:

- os campos ficaram maiores e o rótulo fica sempre visível;
- **"Lembrar de mim"** guarda o seu e-mail para a próxima vez. Não muda
  quanto tempo você fica logado — isso continua como era;
- **"Esqueci minha senha"** saiu do rodapé e foi para o lado do campo de
  senha. Ele continua fazendo a mesma coisa: manda um link de acesso para o
  seu e-mail;
- o botão avisa o que está acontecendo ("Entrando…") e não deixa clicar
  duas vezes;
- quando falta preencher algo, a mensagem aparece embaixo do campo que
  falta, e não no fim do formulário.

O painel escuro é vivo: correntes de luz passeiam devagar ao fundo,
placas de vidro sobem e descem, e o cursor deixa um rastro verde por onde
passa. Nada disso atrapalha a leitura — o efeito se apaga sozinho na
coluna onde está o texto.

No celular os dois lados viram um só: faixa da marca em cima, formulário
embaixo, e o formulário cabe na tela sem rolar. Ali o fundo é fixo: reação
ao toque não faria sentido, e a bateria agradece.

Quem configurou o computador ou o telefone para **reduzir animações** vê a
tela parada, sem perder nada do que ela faz.

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

**Ícone da marca na aba do navegador.** Até agora a aba mostrava o ícone do
Next.js, que veio no setup do projeto e nunca foi trocado. Agora é o
monograma do TAFLOW — verde ácido e branco-nuvem sobre grafite, que funciona
tanto em aba clara quanto escura.

**A marca do TAFLOW na barra lateral.** Empresa que ainda não subiu a logo
dela agora mostra a nossa, e ela acompanha o tema: escrita grafite no claro,
cor nuvem no escuro. O verde da assinatura não muda.

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
