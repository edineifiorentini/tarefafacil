# Testes pendentes

O que foi construído mas **não** foi verificado rodando.

**Atualização de 18/ago/2026:** o painel do navegador voltou e a maior parte
desta lista foi verificada na tela. O que sobrou está marcado abaixo — e o
que era só falta de verificação foi riscado.

Verificado com dado real: recorrências (criar, gerar 12 previsões, gerar de
novo sem duplicar, editar com alcance "toda a série", e o dia 31 caindo em
28/fev), trilha de auditoria (capturando e com estado vazio correto), link
público (gerar, abrir como visitante sem sessão, contador subindo para 1,
`noindex`, nenhum vazamento no HTML), aviso de tarefa criada, confirmação de
exclusão, criação de grupo com participante, e as três séries do gráfico do
mês.

Achados nessa varredura: a animação centralizada somava dois translates
(todo modal entrava torto) e as duas caixas de check da lista tinham virado
a mesma forma. Ambos corrigidos.

Cada item diz o que já foi verificado por outro caminho — para não gastar
tempo confirmando o que já está provado.

---

## 1. O que motivou a maior parte desta lista

Os três últimos defeitos apareceram no uso, não nos testes:

- relógio preso na montagem (o dono percebeu que o gráfico não mexia);
- painel contando em UTC e sino em local;
- aviso de chat apontando para demanda apagada.

Nenhum seria pego por teste de unidade, porque nenhum estava na lógica pura
— estavam na _ligação_ entre dados e tela. É o argumento para os testes
ponta a ponta da Fase 9.

---

## 2. Painel — relógio (correção de 18/ago)

- [ ] Abrir o painel, **sem recarregar**, concluir uma demanda na Lista e
      voltar: "Demandas abertas" cai, "Taxa de conclusão" sobe, o
      micrográfico acompanha.
- [ ] Reabrir uma demanda concluída: os números voltam.
- [ ] Sino: entregar uma demanda atrasada e ver o alerta sumir sem
      recarregar.
- [ ] Depois das 21h (fuso local), concluir uma demanda e conferir que ela
      cai na semana **de hoje** no gráfico "Entrega do mês" — era o caso do
      UTC. Coberto por teste de unidade; falta ver na tela.

## 3. Chat — modelo novo (rodadas 1 a 3)

Já verificado no banco: canais, etiqueta preservada na migração, aviso de
demanda no Geral, menção gerando notificação, RPCs recusando chamada sem
usuário.

- [ ] A lista mostra **Geral** no topo, grupos e conversas diretas.
- [ ] Criar grupo pelo ícone, escolher participantes, e o grupo abrir já
      selecionado.
- [ ] Enviar mensagem com etiqueta de setor; a etiqueta aparece na linha e
      **zera** no compositor depois de enviar.
- [ ] Filtro de assunto no topo: só aparecem setores citados; "Tudo" volta.
- [ ] Com filtro ativo, a faixa de prazos daquele setor aparece.
- [ ] Responder uma mensagem: a citação aparece acima, e Esc cancela.
- [ ] "Carregar mensagens anteriores" com mais de 50 mensagens no canal.
- [ ] Criar uma demanda e ver o aviso surgir sozinho no Geral, etiquetado.

### 3.1 Conversa direta — o teste que exige duas sessões (AINDA PENDENTE)

**É o item mais importante da lista**, porque é o único com consequência de
privacidade e o único que não dá para provar sozinho.

- [ ] Com dois usuários logados (janelas anônimas diferentes), A abre
      conversa direta com B e escreve.
- [ ] Um terceiro membro **não** vê o canal na lista nem as mensagens.
- [ ] B responde e A recebe.
- [ ] A e B abrindo conversa um com o outro caem no **mesmo** canal (o par
      canônico), não em dois.

## 4. Ordem alfabética dos setores (18/ago)

- [ ] Criação rápida, painel da demanda, filtro da Lista, Quadro, Projeto,
      Busca e etiqueta do chat: todos em ordem alfabética.
- [ ] Barra lateral **continua** na ordem arrastada — não é para alfabetizar.

## 5. Central de notificações (Fase 8)

Já verificado no banco: trigger de menção, bloqueio de inserção pelo
cliente, alerta derivado aparecendo no sino.

- [ ] Menção em comentário de demanda chega para o mencionado (precisa de
      dois usuários).
- [ ] Atribuir demanda a outra pessoa gera aviso para ela.
- [ ] "Marcar todas como lidas" some com o destaque.
- [ ] Clicar num aviso do chat leva ao canal certo.

---

## 6. Ambiente

- [ ] Localhost lento: o Next avisa `Slow filesystem detected` (468ms num
      benchmark que costuma dar dezenas). Mover `.next` ou o projeto para o
      SSD antes de culpar o código por lentidão.

---

## 7. Indicação de afiliado ponta a ponta (20/ago)

Já verificado rodando: o link `/r/<code>` grava o clique e o cookie (dois
cliques, dois registros), código inválido não grava nem cookie nem clique, a
regra de atribuição só pega workspace novo e sem afiliado, e o painel mostra
cliques, empresas e valor a repassar. Também verificado pelas rotas reais:
criar plano, criar empresa já no plano herdando os assentos, 409 ao excluir
plano em uso e exclusão de empresa voltando a funcionar.

Falta o único trecho que precisa de um cadastro humano de verdade:

- [ ] Abrir `/r/<code>` num navegador sem sessão, criar conta pelo magic
      link e conferir que a empresa nasce com `affiliate_id` e
      `affiliate_percent` preenchidos — o caminho passa por
      `/auth/callback`, que só existe com e-mail real.
- [ ] Fazer login de novo depois disso e conferir que **não** conta uma
      segunda indicação.

---

## 8. Recado de voz (21/ago)

Já verificado rodando, no navegador do app: o tocador mostra "0:08" **antes**
de tocar, a barra anda (0% → 11% em 2,5s), o rótulo vira "0:01 / 0:08", a
velocidade cicla 1x → 1,5x → 2x e o 2x é real (2,01s de relógio avançaram 4s
de áudio). A URL assinada, a leitura por RLS do membro e o download com
`content-type: audio/wav` foram exercitados contra o banco de produção. O
`check` da 0054 recusa duração zero. 21 testes de unidade cobrem duração,
escolha de formato e as assinaturas binárias novas — inclusive executável
renomeado para `.webm`, que continua barrado.

Falta o que exige microfone e outros navegadores:

- [ ] **Gravar de verdade.** A janela de visualização do Claude bloqueia o
      microfone (`permissions.query` devolve `denied`), então só foi possível
      provar o caminho de recusa — a mensagem "Microfone bloqueado. Libere o
      acesso nas permissões do navegador." aparece na hora. Gravar, ouvir a
      prévia, descartar e enviar precisa do navegador do dono.
- [ ] **Reprodução cruzada.** Gravar no Chrome/Android (webm/opus) e ouvir no
      Safari/iPhone, e o contrário (mp4/aac). É o risco número um desta
      função: não existe formato que os dois gravem, e o tocador só sabe
      avisar que não conseguiu tocar.
- [ ] **Teto de 2 minutos** encerrando a gravação sozinho, com o aviso de
      "resta 0:15" nos últimos quinze segundos.
- [ ] **Recado curto demais** (menos de 1s) virando aviso em vez de mensagem.
- [ ] **Microfone solto ao sair da conversa** — o indicador de gravação do
      navegador precisa apagar ao trocar de tela no meio de uma gravação.

---

## 9. Reação de emoji (21/ago)

Já verificado rodando, no navegador do app: o seletor abre com os sete
emojis, a ficha aparece na hora (antes do servidor) e continua depois,
reagir com um segundo emoji na mesma mensagem funciona, e tocar na própria
ficha desfaz. Contra o banco de produção, com sessão de membro comum: emoji
fora do conjunto recusado pelo `check`, reagir no lugar de outra pessoa
recusado pela RLS, `channel_id` ou `workspace_id` que não são os da mensagem
recusados, apagar reação alheia não apaga, e a mesma reação duas vezes esbarra
na chave primária. Nove testes de unidade cobrem contagem, "minha reação",
ordem estável e emoji desconhecido.

Falta o que precisa de duas pessoas ao mesmo tempo:

- [ ] Duas pessoas reagindo com o mesmo emoji somam na mesma ficha (deve
      mostrar "2"), e a ficha fica marcada só para quem reagiu.
- [ ] A reação de A aparece para B no ciclo de seis segundos do chat.
- [ ] Numa conversa direta de terceiros, a reação não vaza — é o mesmo teste
      de isolamento da seção 3, agora também para `chat_message_reaction`.
