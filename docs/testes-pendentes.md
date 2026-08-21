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

---

## 10. Funil de vendas (21/ago)

Já verificado rodando, na tela e com sessão de membro comum: criar
negociação com cliente novo (que entra como prospecto), card aparecendo em
"Novo lead", total da coluna e "em aberto" subindo para R$ 450.000,00, mover
para "Fechado" marcando ganho e promovendo o cliente a ativo com aviso na
tela, "em aberto" voltando a zero e conversão indo a 100%, mover para
"Perdido" abrindo a caixa de motivo e gravando o texto. No banco: voltar a
uma etapa aberta limpa `won_at`/`lost_at`, ganha e perdida ao mesmo tempo é
recusada pelo check, e excluir etapa com negociação dentro devolve 23503.
Onze testes de unidade cobrem totais, ordem e desfecho.

Falta o que a automação não alcança bem:

- [ ] **Arrastar de verdade**, com o mouse, entre colunas — o que foi
      exercitado foi o menu "mover para outra coluna" do card, que passa
      pelo mesmo caminho, mas não é o gesto que a pessoa usa.
- [ ] Reordenar e renomear etapa, e criar uma etapa nova (a nova precisa
      entrar antes de "Fechado", não depois).
- [ ] Funil com volume — dezenas de negociações por coluna, para ver se a
      soma no cabeçalho e o arraste continuam suaves.

---

## 11. Catálogo, consultas, teste e vencidos (21/ago)

Já verificado rodando, na tela: cadastrar três serviços e vê-los na lista;
no funil, clicar em dois somando título e valor (250.000 + 150.000 =
400.000); consulta de CNPJ preenchendo razão social, fantasia, telefone,
CEP, rua, número, bairro, cidade e UF a partir de 00000000000191; consulta
de CEP preenchendo Rua Paraná / Centro / Cascavel / PR, e CEP incompleto não
disparando busca; faixa "Teste grátis — faltam 5 dias"; escolher o plano Pro
gravando e a faixa sumindo; blocos de vencidos somando R$ 2.500,00 a receber
e R$ 800,00 a pagar, com "mais de 1 mês" de atraso. A correção da 0059 foi
verificada com sessão de dono comum: as cinco escritas comerciais devolvem
42501 e renomear continua permitido.

Falta o que precisa de gente ou de tempo:

- [ ] **Cadastro real ganhando os 7 dias.** O trigger foi verificado por
      código, mas a faixa e a contagem só aparecem de verdade num cadastro
      novo feito por e-mail real.
- [ ] **Serviço desativado sumindo do funil** e continuando na tela de
      Serviços.
- [ ] **Consulta com o serviço fora do ar.** minhareceita.org é instância
      pública mantida pela comunidade; a rota devolve 502 e a tela manda
      preencher à mão, mas isso não foi visto acontecendo.
- [ ] **CNPJ com situação diferente de ATIVA** mostrando o aviso.
- [ ] Cliente antigo (com `address` de texto livre) sendo reeditado: o campo
      "Endereço anterior" precisa sumir assim que a rua nova for preenchida.

---

## 12. Barra lateral e bloqueio de cadastros (21/ago)

Já verificado rodando: a navegação caiu de 502px para 289px e os setores
subiram de 34px para 297px (sete visíveis) num viewport de 1366×768; o grupo
Comercial abre com os cinco itens, grava o cookie `nav_comercial` e mantém as
dicas `6` e `7`; "Plataforma" aparece no menu da conta. O interruptor de
cadastros liga e desliga pelo painel e a rota pública `/api/signups`
acompanha. Contra o banco: cadastro novo recusado com a porta fechada,
**convidado com convite pendente entrando mesmo assim**, convite vencido
recusado, e tudo voltando ao normal ao reabrir.

Falta o que precisa de outra sessão ou de outra pessoa:

- [ ] **A mensagem traduzida na tela de login.** Cada elo foi verificado em
      separado (o erro bruto é "Database error creating new user"; a rota
      devolve `open:false`), mas a frase amigável não foi vista na tela —
      exige um navegador sem sessão.
- [ ] **Cadastro pelo Google com a porta fechada.** O erro volta pelo
      `/auth/callback`, que hoje manda para `/login?error=auth` sem a
      tradução.
- [ ] **Convite por link aberto com a porta fechada**, para confirmar que o
      aviso da tela corresponde ao que acontece.
- [ ] A barra lateral num monitor menor ainda (1280×720) e no celular.

---

## 13. Configurações em abas (21/ago)

Já verificado rodando: as cinco abas trocam de conteúdo; Assinatura mostra
"Ativa / Plano Pro / R$ 99,00 por mês" com o seletor de planos junto;
Notificações mostra os seis interruptores; e desligar "Prazos" zerou o
contador do sino (de "1 pendente" para nenhum), com o aviso voltando ao
religar. Sete testes de unidade cobrem o filtro, incluindo que a lista de
origem continua inteira — o filtro é de exibição.

Falta:

- [ ] Preferência com **duas pessoas**: A desliga menções e continua sem ver;
      B, que não mexeu em nada, continua vendo as dele.
- [ ] Voltar do Google Agenda (`/config?gcal=ok`) abrindo direto na aba
      Geral, que é onde está o cartão de integração.
- [ ] A aba Assinatura vista por quem **está em teste de verdade** (a minha
      empresa tem plano; o caso do trial só apareceu com dado forçado).
