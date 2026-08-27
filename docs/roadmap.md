# Roadmap

O que ainda não existe, por que ficou para depois e o que precisa ser decidido
antes de começar. `docs/build.md` é o plano das etapas E00–E18 (concluídas);
aqui fica o que veio depois delas.

Ordem dentro de cada bloco é sugestão, não compromisso.

---

## 1. Chat interno da equipe

Pedido do dono em 17/ago/2026. Rodada 1 entregue na migration 0038.

**Decisões tomadas** (e o motivo, para não serem refeitas por engano)

- **Um "Geral", grupos e conversas diretas. Setor é ETIQUETA, não canal.**
  A rodada 1 criou um canal por setor; na prática isso partia a conversa em
  doze salas que ninguém acompanhava. Revisto pelo dono em 18/ago/2026: uma
  sala só, com etiqueta de assunto e filtro, mantém o tema localizável sem
  espalhar a equipe. Migração 0040 moveu as mensagens existentes para o
  Geral preservando o setor como etiqueta.
- **Sem Realtime.** Websocket é conexão aberta por aba e entra na conta.
  Busca a cada 6s enquanto a tela está aberta e visível resolve para equipe
  pequena com custo previsível. Trocar só com número medido.
- **Aviso de demanda criada vai para o canal; prazo continua no sino.** Um é
  fato passado (histórico da equipe), o outro é estado atual (caixa de
  entrada pessoal). Fazer os dois nos dois lugares duplicaria o ruído.
- **Filha de recorrência não avisa.** Uma demanda semanal encheria o canal
  com o mesmo texto toda semana.
- **`viewer` lê e não escreve**, mesmo critério do resto do app.
- **Não lidas por `last_read_at`** em (canal, usuário). Uma linha de leitura
  por mensagem seriam 50 mil linhas para 10 pessoas e 5 mil mensagens.

**Rodada 2 entregue** (migration 0039): mensagem direta, resposta a uma
mensagem, paginação para trás e resumo de prazos do setor no topo do canal.

- Conversa direta mora na mesma tabela, mas **toda leitura passa por
  `can_read_channel`** — a regra da rodada 1 (`is_member(workspace_id)`)
  entregaria conversa privada ao workspace inteiro.
- O par de participantes é canônico (`dm_key` = menor:maior). Sem isso, A→B
  e B→A abririam duas conversas para o mesmo assunto.
- Criar a conversa é RPC `open_direct_channel`, não insert do cliente:
  exige escrever participante para duas pessoas, e a policy de canal é só de
  owner/admin. A função confere que ambos são membros ativos.
- O resumo de prazos é do **setor e agregado**; o sino é **pessoal e por
  demanda**. É o que permite os dois existirem sem repetir a informação.
- Paginação por cursor de `created_at`, não offset: com mensagem nova
  chegando, offset repetiria e pularia linhas entre páginas.

**Rodada 3 entregue** (migrations 0040 e 0041): grupos com participantes
escolhidos, etiqueta de setor na mensagem com filtro, e a virada do modelo
descrita acima.

- Grupo é privado como a conversa direta: `can_read_channel` exige
  participação. Criar é RPC `create_group_channel` — pelo mesmo motivo do
  `open_direct_channel`.
- Sair do grupo existe; tirar outra pessoa não. Moderação é decisão que este
  produto ainda não tomou, e fingir que tomou seria pior.
- Apagar uma demanda deixava o aviso dela no chat apontando para um id
  inexistente (defeito achado em produção, migration 0041). A mensagem fica
  — "Fulano criou a demanda X" continua verdade —, só o link some.

**Pontas soltas fechadas** (migration 0042): gestão de participantes,
renomear e sair do grupo ganharam interface, e o contador de não lidas
chegou à barra lateral.

- Nasceu um cabeçalho de canal. Além de abrigar as ações do grupo, ele diz
  em que conversa você está — o nome só existia na lista lateral, que some
  em tela estreita.
- Renomear é RPC `rename_group_channel`: a policy de canal é de
  owner/admin, e quem cria um grupo pode ser membro comum — seria dono de um
  grupo que não consegue renomear. Renomeia quem criou, ou quem administra.
- O contador da barra lateral busca a cada 60s, não a cada 6s como a tela do
  chat: ali importa ficar sabendo que chegou algo, não ver no segundo em que
  chega — e a barra lateral existe em toda tela do app.
- `useChatUnreadTotal` mudou de casa (de `ChatView` para
  `lib/queries/useChat`): importá-lo do componente arrastaria a interface
  inteira do chat para o bundle de todas as páginas.

**Defeitos achados em uso (migration 0047)**

- **Grupo e conversa direta não podiam ser criados.** A 0038 criou
  `unique (workspace_id) where sector_id is null` para garantir um só
  "Geral". Na época era equivalente, porque só o Geral tinha setor nulo. A
  0040 removeu os canais de setor e trouxe grupo e conversa direta, que
  também têm setor nulo — o índice continuou igual em SQL e passou a
  significar "um canal por workspace". A conversa direta esteve quebrada
  desde a rodada 2 e eu não peguei: verifiquei que a RPC recusava chamada
  sem usuário, nunca que uma criação legítima funcionava. O índice agora
  fala do que a regra é (`where kind = 'geral'`).
- **Mensagem em conversa direta não avisava.** Só menção gerava
  notificação. Numa conversa de duas pessoas a mensagem já é endereçada a
  você — exigir @nome ali é absurdo. Grupo e Geral continuam sem aviso por
  mensagem: lá o contador da barra lateral é o canal certo, e notificar cada
  mensagem coletiva faria as menções sumirem no ruído.

**Rodada 4 — o que ficou de fora**

- ~~Anexo em mensagem~~ Entregue na migration 0048. Um arquivo por mensagem,
  em `<workspace>/chat/<canal>/`. O primeiro nível precisa ser o workspace
  porque as policies de storage fazem `foldername(name)[1]::uuid`; o segundo
  ser "chat" é o que separa da varredura de órfãos. A varredura foi ensinada
  a reconhecer as duas origens — sem isso ela apagaria todo arquivo de chat
  no domingo seguinte.
- **Retenção.** Chat cresce e ninguém apaga. Definir janela antes de a tabela
  passar de algumas dezenas de milhares de linhas;
- O contador lateral olha uma janela de 300 mensagens recentes do workspace.
  É teto de segurança, não paginação: se estourar, a contagem precisa descer
  para o banco;
- **Pendente de teste com duas sessões:** a RLS da conversa direta foi
  escrita e revisada, mas exercitá-la de verdade exige dois usuários logados
  ao mesmo tempo. É o primeiro item a validar em homologação.

**Recado de voz — entregue (21/ago/2026, migration 0054)**

Gravar áudio na conversa, como no WhatsApp, mas com o recorte decidido pelo
dono: teto de duração, duração visível antes de tocar, velocidade, e
transcrição adiada.

Não houve tabela nova. Recado de voz é o anexo da 0048 com um gravador na
frente e um tocador atrás: `storage_key`, `mime_type`, `file_name` e
`file_size_bytes` já existiam, o caminho `<workspace>/chat/<canal>/` já era o
certo e a varredura de órfãos já reconhecia esse ramo. A 0054 acrescentou um
campo só, `audio_duration_ms`.

**Por que a duração vive no banco.** O tocador precisa dizer "0:42" ANTES de
tocar — ler do arquivo exigiria assinar a URL e baixar o áudio de toda
mensagem só para desenhar a lista. E não adiantaria: WebM saído do
`MediaRecorder` não traz duração no cabeçalho, e o `<audio>` devolve
`Infinity` até alguém procurar até o fim. Quem sabe quanto durou é quem
gravou, e é lá que se mede. É por isso também que a barra de progresso usa
`audio_duration_ms` como denominador, nunca `audio.duration`.

**O validador aprendeu áudio.** `lib/utils/file-type.ts` reconhecia png,
jpeg, gif, webp, pdf e zip por assinatura binária — um `.webm` caía em "Tipo
de arquivo não permitido", ou seja, o recurso não teria funcionado nem uma
vez. Agora há ramo para EBML (`1A 45 DF A3`), `ftyp` no offset 4, `OggS` e
RIFF/WAVE. O RIFF virou ramo com dois desfechos, porque webp e wav começam
igual e só se separam no offset 8. Executável renomeado continua parando na
lista de assinaturas bloqueadas: o mime do navegador é só rótulo, quem
autoriza é o cabeçalho.

**Formato varia por navegador e o arquivo vai como veio.** Chrome e Firefox
gravam webm/opus, Safari grava mp4/aac; não existe formato que os dois
produzam. `pickRecorderMime` escolhe o melhor disponível e o tocador avisa
quando o navegador não conseguiu tocar — transcodificar exigiria ffmpeg no
servidor, que não cabe no serverless de hoje. **Reprodução cruzada (gravado
no Android, ouvido no iPhone) é o primeiro teste de campo.**

O recorte, item por item:

- **Teto de 2 min** (`MAX_RECORDING_MS`), e a gravação encerra sozinha ao
  chegar lá em vez de recusar no envio — descobrir o limite depois de falar
  dois minutos é perder o recado. O teto é decisão de produto: recado de
  quatro minutos que devia ser uma demanda é o modo de falha conhecido desta
  função em ferramenta de trabalho.
- **Duração antes de tocar**, e posição/total durante.
- **Velocidade 1x / 1,5x / 2x**, que devolve ao ouvinte o "pular" que o texto
  dá de graça.
- **Descartar antes de enviar**, e recado abaixo de 1s vira aviso em vez de
  mensagem — quase sempre é clique duplo.
- **Microfone negado tem frase própria** para cada motivo (bloqueado, sem
  microfone, falha genérica). Recusa silenciosa é o pior desfecho.
- **Um recado por vez na página**: começar um pausa o outro.
- O microfone é solto ao sair da conversa — indicador de gravação aceso
  depois de fechar a tela faz a pessoa achar, com razão, que continua sendo
  ouvida.

**Falta**, e continua sendo decisão à parte: **transcrição**. É o que traz o
áudio de volta para a busca e para quem não ouve — o resto do produto é texto
que a busca alcança, e recado de voz é o único conteúdo opaco. Custa um
provedor a mais.

**Reação de emoji — entregue (21/ago/2026, migration 0055)**

Sete opções: 👍 ❤️ 😂 😮 😢 🙏 👀. Os seis primeiros são os do WhatsApp, onde
a equipe já aprendeu o significado; 👀 entra porque numa ferramenta de
trabalho "estou vendo isso" é a resposta mais útil que existe. O dono pediu
"os mais básicos", e conjunto curto é o recurso — não uma limitação a ser
corrigida depois: sete cabem numa linha, são reconhecíveis de relance e não
viram uma segunda linguagem dentro da conversa.

Quatro decisões estruturais:

1. **O conjunto vive no `check` do banco**, não só na interface. Com a coluna
   livre, qualquer cliente gravaria texto arbitrário e a tela teria de
   desenhar o que viesse. Acrescentar um emoji é uma migration de uma linha;
   deixar a porta aberta não teria volta. A lista em `lib/chat/reactions.ts`
   precisa bater exatamente com a do `check` — inclusive o seletor de
   variação do ❤️ (`U+2764 U+FE0F`), que é um caractere diferente de `❤`.
2. **A chave é (mensagem, pessoa, emoji).** Clique duplo ou corrida de rede
   não conta duas vezes — quem garante é o banco, não o cliente.
3. **`channel_id` e `workspace_id` são copiados na linha**, para a conversa
   buscar todas as reações do canal numa varredura de índice, sem juntar com
   `chat_message` a cada seis segundos. A cópia não pode divergir porque a
   policy de insert confere que os dois batem com os da mensagem.
4. **Só se escreve a própria reação.** `user_id = auth.uid()` no insert e no
   delete. Sem policy de update: trocar de reação é tirar e pôr.

A ficha muda antes da resposta do servidor (regra 6) e volta atrás se o
pedido falhar. Reagir é o gesto mais barato da conversa: se piscar esperando
a rede, a pessoa clica de novo achando que não pegou.

Reação existe só em mensagem de gente. Aviso de "criou a demanda X" é
notificação, não conversa.

---

## 2. Fase 8 — o que falta

A central de notificações saiu (2b7084c). Restam:

- ~~**Link público revogável**~~ Entregue na migration 0046, para DEMANDA.
  A fatia pública é montada campo a campo em `lib/share/publicTask.ts`
  (marcado `server-only`), não filtrada na interface — máscara visual não é
  controle de acesso (§15). Expira sempre (`expires_at` NOT NULL, padrão 30
  dias), revogar não apaga a linha, e o contador de aberturas responde "o
  cliente chegou a olhar?".

  Falta compartilhar uma VISÃO filtrada (lista), que o §11 também prevê —
  exige decidir que recorte de lista é seguro expor.

- **Permissões granulares.** Hoje são quatro papéis para o workspace inteiro.
  O spec pede recorte por setor e por cliente, e transferir responsabilidades
  antes de remover alguém.
- ~~**Auditoria de operações sensíveis.**~~ Entregue na migration 0044:
  trilha de workspace para dinheiro, contratos, permissões e exclusões, lida
  só por dono/admin, escrita só por trigger e **imutável** (sem policy de
  update nem delete). Login ainda não entra — depende de gancho no Supabase
  Auth, não de trigger em tabela nossa.
- ~~**Jobs observáveis.**~~ Infraestrutura criada quando apareceu o primeiro
  trabalho que a exigia de verdade: a limpeza de anexos órfãos
  (`vercel.json` + `/api/cron/limpar-anexos`). A rota se autentica por
  `CRON_SECRET` e devolve o que inspecionou, referenciou e removeu — cron
  sem registro de execução roda errado por meses sem ninguém notar.

  Falta pendurar nela a renovação do `watch` do Google, que continua
  dependendo de URL pública estável.

---

## 3. Funil de vendas — entregue (21/ago/2026, migration 0056)

A fase 4 do plano, aberta pelo dono. O `Board` genérico da ADR-004 foi
escrito em agosto exatamente para isto: o funil não trouxe um segundo
quadro, reusou o mesmo organismo do Kanban de demandas. O que o `Board`
ganhou foi um `subtitle` opcional na coluna — texto puro, para o total em
reais no cabeçalho — e ele continua sem conhecer nem `Task` nem `Deal`.

**O card é a negociação, não o cliente.** Foi a primeira decisão, e é a que
sustenta o resto: com o cliente como card, a prefeitura que se fecha em
março e volta a negociar em setembro não tem para onde ir — a etapa viraria
o status dela, fechar exigiria tirar o card do quadro, e o histórico de
"ganhamos três, perdemos uma" deixaria de existir.

**Um cadastro de contato só.** Criar um lead no funil cadastra o cliente
como prospecto na mesma ação. Não existe lista de "leads" paralela à de
clientes — duas listas de gente é o jeito conhecido de acabar com o mesmo
telefone em dois lugares e nenhum deles confiável.

**A etapa tem um `kind`** (aberta / ganho / perdido), e é ele que decide o
comportamento, nunca o nome. O dono pode renomear "Fechado" para "Assinado"
sem que o sistema pare de marcar a data de ganho. Voltar o card para uma
etapa aberta desfaz o desfecho: negociação que volta para "Em negociação" e
continua marcada como ganha mentiria no total.

**Fechar marca o ganho e promove o cliente a ativo — e nada mais.** Foi a
escolha do dono para a primeira rodada. Note que a promoção não tem volta
automática: mover depois para "Perdido" não rebaixa o cliente, porque ele
pode ter contrato ativo vindo de outra negociação.

**O motivo da perda é perguntado depois do arraste**, e responder é
opcional. Travar o gesto num formulário faria a pessoa desistir de mover o
card, e funil que não se move não serve para nada; motivo em branco é melhor
do que motivo inventado para fechar a caixa.

**Ganho fica cinza, não verde.** O `tokens.css` reserva o verde a dado
financeiro positivo e o tira da paleta de coluna de propósito. No quadro,
cinza já é a cor de "saiu do fluxo" — quem diz que a negociação foi ganha é
o troféu no card e o valor no cabeçalho.

O workspace nasce com as seis etapas (mesma lição das migrations 0043 e
0051), etapa com negociação dentro não pode ser excluída (`on delete
restrict`, com aviso em vez de erro cru), e o total "em aberto" ignora ganho
e perdido — somá-los daria um número que só sobe e não ajuda a decidir nada.

**Falta**, e são as continuações naturais: vínculo entre negociação e
demanda (o spec da fase 4 prevê), histórico de interação, e gerar contrato a
partir da negociação ganha — o dono preferiu usar o funil por uma ou duas
semanas antes de eu automatizar essa cadeia.

---

## 4. Rodada do CRM — catálogo, consultas, teste e vencidos (21/ago/2026)

Quatro pedidos vindos de prints de outro SaaS, nas migrations 0057 a 0060.

**Catálogo de serviços** (0057). Nome, preço, unidade e ativo. No funil, os
serviços viram fichas que somam: clicar em dois preenche o título com os dois
e o valor com a soma. **Preencher, não vincular** — o preço de tabela é ponto
de partida da conversa, e quase toda negociação ajusta alguma coisa; o que
vale é o que ficou escrito na negociação. Serviço não se apaga, se desativa.

**CEP e CNPJ preenchem sozinhos** (0058). O endereço do cliente virou campos
separados; `client.address` (texto livre) continua lá e só aparece enquanto
os campos novos estiverem vazios — repartir texto livre por adivinhação erra
em "s/n" e em complemento, e o erro fica gravado.

As duas consultas rodam **no servidor**, em `/api/lookup/*`: o IP de quem usa
o sistema não precisa ir para um terceiro porque alguém digitou um CEP, e o
limite por IP passa a ser do servidor, com cache na frente.

- CEP: BrasilAPI, sem chave. Dispara sozinho ao completar os oito dígitos.
- CNPJ: **minhareceita.org**. A BrasilAPI foi testada primeiro e responde
  **403 no endpoint de CNPJ** — está fechada. ReceitaWS (3/min) e CNPJá
  aberto (5/min) também funcionam e ficam de reserva; trocar é um arquivo.
  Só mapeamos o que o cadastro usa: a resposta traz o quadro societário com
  CPF parcial dos sócios e **nada disso entra no sistema**.
- **Não existe consulta de CPF, e não é esquecimento.** CNPJ é dado público
  da Receita; CPF exige bureau pago com contrato e finalidade declarada, e
  puxar dado de pessoa física sem base legal é problema de LGPD antes de ser
  de custo. Com CPF o sistema valida o dígito, e só.

A situação cadastral vem junto e vira aviso quando não é "ATIVA": fechar
contrato com CNPJ baixado é o tipo de coisa que só aparece quando a nota é
recusada.

**Teste de 7 dias** (0060). Todo cadastro novo nasce em teste, com
`trial_ends_at`. **A data não bloqueia nada**, por decisão do dono: enquanto
a cobrança do EFI não existe, cortar no oitavo dia seria trancar alguém para
fora por uma fatura que o sistema não sabe emitir. Ela serve para a faixa de
contagem e para a aba Empresas. Quando o gateway entrar, ligar o corte é
copiar a data para `access_expires_at` — o portão que já vale para todo
mundo. Escolher plano grava **intenção**: muda `plan_id`, não mexe em
assentos nem em vencimento, senão bastaria clicar no plano mais caro para
ganhar assentos de graça.

**Vencidos em destaque** no Financeiro, fora do recorte de mês — conta de
março que ninguém pagou continua vencida em agosto, e é justamente ela que
some quando a tela só olha o mês corrente. Junto veio a correção de
`isOverdue`, que comparava `due_date` com `toISOString()` (UTC): em UTC-3,
toda conta que vence hoje aparecia como vencida a partir das 21h. É a mesma
correção que o painel e o sino já tinham recebido.

---

## 5. Correção de segurança — o dono podia vender para si mesmo (0059)

Encontrada ao ler a RLS de `workspace` para construir o teste de 7 dias, e
confirmada contra o banco antes de corrigir.

A policy da 0011 diz `for update using (has_role(id, owner/admin))`, e **RLS
é por linha, não por coluna**. Qualquer dono conseguia, do próprio navegador
e com a chave publishable:

```
update workspace set seat_limit = 999             -- assentos de graça
update workspace set access_expires_at = '2099'   -- assinatura eterna
update workspace set suspended = false            -- desbloqueio próprio
```

As três passaram no teste. Ou seja: o controle de venda por período — que a
0017 usa dentro de `has_role` para barrar escrita de workspace vencido — era
autoatendimento. E um período de teste não vale nada se quem testa consegue
estendê-lo.

A correção é **grant por coluna**, que é o que o Postgres tem para isso: a
RLS continua decidindo QUEM chega na linha, o grant decide QUAIS colunas essa
pessoa pode tocar. `revoke update on workspace from authenticated` mais
`grant update (name)` — renomear o próprio workspace é legítimo, o resto
(plano, assentos, vencimento, bloqueio, indicação, contato de cobrança) só
pelo servidor.

Nada quebrou porque **o app nunca escreveu nessa tabela pelo cliente**: o
único caminho era a RPC `create_workspace`, que é security definer. Depois da
correção, as cinco tentativas voltam 42501, renomear continua permitido, a
leitura continua funcionando e o painel da plataforma (chave secreta)
continua administrando.

Fica a lição para toda tabela com coluna comercial: **policy de update em
tabela que mistura dado do cliente com dado de cobrança precisa de grant por
coluna.** RLS sozinha não separa isso.

---

## 6. Lacunas contra o MVP do spec (§22)

O spec lista o que considera essencial para o MVP comercial. Quase tudo
existe; falta:

- **Testes críticos.** O primeiro conjunto existe — `e2e/share.spec.ts`
  cobre o link público sem login (válido, revogado, expirado, token
  inventado, noindex, contador de visitas e ausência de vazamento). Ele
  **não roda nesta máquina**: o `npm run dev` estoura até 5 minutos de
  espera por causa do disco, não do código. Precisa rodar em máquina normal
  ou CI antes de ser considerado verde.

  O resto dos fluxos ainda depende de login, e login em e2e exige decidir se
  os testes podem criar usuário no Supabase de produção — não há Supabase
  local porque o Docker não roda aqui.

  Antes disso não havia nenhum teste ponta a ponta. Os três últimos
  defeitos — relógio preso na montagem, painel em UTC contra sino em local,
  aviso apontando para demanda apagada — passaram por 191 testes de unidade
  porque nenhum estava na lógica pura: estavam na ligação entre dado e tela.
  Enquanto essa classe só for descoberta por alguém reparando, toda função
  nova entra com o mesmo ponto cego.

- ~~**Auditoria de operações sensíveis.**~~ Entregue (migration 0044). Falta
  só o registro de LOGIN, que não sai de trigger em tabela — precisa de
  gancho no Supabase Auth.
- ~~**Recorrências no Financeiro.**~~ Entregue na migration 0045. A REGRA é
  uma linha em `finance_recurrence`; cada OCORRÊNCIA é um lançamento
  normal, com situação e nota fiscal próprias — ocorrência virtual não
  poderia ser confirmada. Idempotência reaproveita o índice único de
  (source_type, source_id, installment_number) da 0033, com
  `source_type = 'recurrence'`, que é o que garante não duplicar parcela
  vinda de contrato (§8.9).

  O "editar esta e as futuras" do §8.9 está completo: a regra tem editor com
  três alcances — só a regra, as previstas de hoje em diante, ou toda a
  série ainda não realizada. Confirmada nunca muda, verificado no banco.
  "Apenas esta ocorrência" não virou opção do editor de propósito: uma
  ocorrência é um lançamento comum e já se edita na lista do mês.

## 7. Fase 9 — qualidade e lançamento

- Testes ponta a ponta no Playwright cobrindo os fluxos críticos;
- Desempenho das queries principais com volume realista;
- Seed controlado e plano de rollback;
- Documentação operacional e checklist de produção;
- Runner de acessibilidade do Storybook — **bloqueado** por um bug de interop
  ESM entre `aria-query` e o Vite; a auditoria manual da E17 cobre por ora.

---

## 8. Dívidas e adiamentos registrados

Cada item aqui foi uma decisão consciente, não esquecimento.

| Item                                                                           | Por que ficou para depois                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Prévia A4 paginada + PDF nativo do contrato                                    | A janela de impressão do navegador entrega o PDF hoje. Paginação fiel exige motor próprio.                                                  |
| Financeiro rodada 3 (parcelas próprias, recorrência, centro de custo, alertas) | Parcelas de contrato já geram lançamento; o resto só tem valor com uso real para dizer o formato.                                           |
| Gateway de pagamento (EFI Bank)                                                | **Em andamento.** Base pronta (0049 + `lib/billing`); a integração real espera credenciais de homologação. Ver "Assinatura do SaaS" abaixo. |
| Envio automático no WhatsApp (Evolution API ou wuzapi)                         | Pedido em 20/ago/2026. Exige processo com estado fora da Vercel e uma decisão sobre número oficial x não oficial. Ver a seção "WhatsApp".   |
| Verificação do app no Google                                                   | Exige domínio próprio publicado.                                                                                                            |
| E-mail de convite de verdade (Resend)                                          | O convite funciona por link; e-mail é conforto, não bloqueio.                                                                               |
| `events.watch` do Google em produção                                           | Precisa de URL pública estável.                                                                                                             |
| Renovação do `watch` do Google por cron                                        | A infraestrutura de cron existe agora; falta a URL pública estável do webhook.                                                              |
| Marketing e onboarding guiado (E18)                                            | Adiado no fechamento da E18.                                                                                                                |
| Contador de não lidas no banco                                                 | Hoje o chat conta sobre uma janela de 300 mensagens no cliente. Só vira problema com volume.                                                |
| Retenção da trilha de auditoria                                                | `audit_log` só cresce, e é imutável de propósito. Definir janela e arquivamento antes de virar volume.                                      |
| Registro de login na auditoria                                                 | Exige gancho no Supabase Auth; trigger em tabela não alcança.                                                                               |
| Geração automática de recorrência                                              | Hoje "Gerar previsões" é botão. Renovar o horizonte sozinho exige job — ver "jobs observáveis".                                             |

---

## 9. Painel da plataforma (admin master)

Pedido pelo dono em 20/ago/2026, com prints de outro SaaS como referência.
O `/admin` deixou de ser uma tela só e virou três abas — **Empresas**,
**Planos**, **Afiliados**. As colunas do produto de referência que eram dele
("API não oficial", "Conexões", "Canais") não vieram junto.

**Planos** (migration 0050). Plano deixou de ser enum de três valores e virou
cadastro: nome, valor, teto de usuários, público ou não, ativo ou não.
Atribuir um plano a uma empresa leva os assentos dele junto — a menos que o
admin digite outro número na mesma ação, que aí vale o dele. Plano com
empresa dentro não pode ser excluído (409 `plan_in_use`); o caminho é
desativar. Editar preço vale do próximo ciclo: a fatura emitida guarda cópia
do nome e do valor (`subscription_charge.plan_name`), então o histórico não
muda quando a tabela muda.

**Empresas.** Além de plano e assentos, a empresa agora tem "em teste"
(`trial`) e contato de cobrança próprio — nem sempre quem paga é quem usa o
sistema, e o e-mail de login não serve para os dois papéis.

**Afiliados** (migration 0052). Cada afiliado tem um link `/r/<code>` que
registra o clique, guarda o código num cookie de 90 dias e manda para o
login. A indicação só vira atribuição quando a conta é criada, em
`/auth/callback`: a função só atribui workspace **sem afiliado** e
**recém-criado**, senão um clique reatribuiria cliente antigo e um cookie
esquecido daria comissão a quem não trouxe ninguém.

Três decisões que valem para sempre:

- **A empresa guarda cópia do percentual** (`workspace.affiliate_percent`).
  Mudar a tabela do afiliado não reescreve o que já foi combinado.
- **A comissão exibida sai de cobrança PAGA**, não de assinatura ativa —
  antes de o dinheiro entrar não há o que repassar.
- **Clique não guarda IP.** Origem e navegador bastam; IP é dado pessoal que
  não muda nenhuma decisão aqui.

`affiliate` e `affiliate_click` têm RLS ligada e **nenhuma policy**: só a
chave secreta enxerga. Quando existir portal do afiliado logado, ganha policy
própria.

**Falta**: portal do próprio afiliado (hoje só o admin vê os números),
registro de repasse (pago/pendente) e mostrar plano público na tela de
cadastro.

**Dois defeitos encontrados no caminho**, ambos anteriores a este trabalho:

- Migration 0051 — o cadastro novo nascia **sem setor**. A 0043 tinha
  corrigido só o caminho `create_workspace`; o trigger `handle_new_user`, que
  é por onde todo cliente novo passa, nunca chamou `seed_default_sector`.
- Migration 0053 — **remover cliente estava quebrado** desde a 0044. Apagar o
  workspace remove a linha primeiro e só então cascateia os filhos; os
  gatilhos de auditoria dessas tabelas tentavam gravar em `audit_log`
  apontando para um workspace que já não existia e a exclusão inteira
  abortava. Agora `write_audit` não escreve quando o workspace já foi embora.

---

## 10. Assinatura do SaaS (EFI Bank)

Decidido pelo dono em 20/ago/2026: a integração é para cobrar **a assinatura
do próprio TarefaFácil**, não o cliente do workspace.

**O que já existe** (migration 0049 + `lib/billing`)

- `billing_plan`, `subscription`, `subscription_charge` e `payment_event`.
- Regra de ciclo pura e testada: período, carência, decisão de cobrar e
  situação derivada.
- `PaymentGateway` com implementação falsa, para tudo acima dela ser
  testável sem credencial.

**Decisões estruturais**

- **O corte de acesso não foi reinventado.** `access_expires_at` já bloqueia
  escrita via `has_role` desde a 0017. Assinatura só empurra essa data. Dois
  portões decidindo acesso é como um deles esquece de fechar.
- **Idempotência no banco**, não no job: índice único em
  `(workspace_id, period_start)` para cobrança e em
  `(provider, external_id)` para evento recebido. Webhook de pagamento é
  reenviado; sem isso o segundo aviso daria um mês de graça.
- **Carência de 5 dias** embutida na data de acesso, num lugar só. Cortar
  quem pagou no dia é o pior defeito possível — quem é cortado injustamente
  não volta.
- **Só o dono lê** assinatura e cobrança. Nem admin do workspace vê valor.
  Nenhuma das tabelas tem policy de escrita: quem cria cobrança e marca como
  paga é o servidor.
- `billing_day` limitado a 28 para o ciclo não andar sozinho em fevereiro.

**O que falta, e depende de credencial**

1. Cliente EFI de verdade (Pix com mTLS — a API exige certificado `.p12`).
2. Rota de webhook com validação de autenticidade e a gravação em
   `payment_event`.
3. Cron mensal que decide e cria as cobranças.
4. Tela do dono: plano, próxima cobrança, QR code, histórico.

Nada disso vai para produção sem teste contra o ambiente de homologação.

---

## 11. WhatsApp — envio automático

Pedido pelo dono em 20/ago/2026: usar **Evolution API** ou **wuzapi** para
disparar mensagem no WhatsApp. Não existe nada disso hoje — nem tabela, nem
rota, nem dependência.

As duas falam o protocolo do **WhatsApp Web** (Baileys na Evolution,
whatsmeow no wuzapi), não a API oficial da Meta. A consequência não é
detalhe: o número pode ser banido, e não há a quem reclamar. O caminho
oficial é a Cloud API, que cobra por conversa e só deixa iniciar conversa com
modelo de mensagem aprovado — mais caro e mais burocrático, e sem o risco de
o canal inteiro sumir numa manhã.

**Decidido em 24/ago, olhando o dgflow**

- **Provedor: Evolution API.** Não por ser tecnicamente superior — em Go
  (whatsmeow) gasta-se menos RAM por sessão, e isso vira dinheiro com 100
  números conectados. É porque ela fala **também a Cloud API oficial** pela
  mesma interface REST: começa no Baileys hoje (única opção sem CNPJ, o
  mesmo bloqueio da seção 20) e vira a chave depois da formalização, sem
  trocar de servidor. Some-se a isso documentação em português e a maior
  base instalada brasileira para exatamente este uso.
- **Alternativa registrada:** [GOWA](https://github.com/aldinokemal/go-whatsapp-web-multidevice)
  (whatsmeow, MIT, multi-dispositivo desde a v8) se o custo de RAM apertar.
  `wuzapi` é o mesmo motor com comunidade menor. **whatsmeow puro não entra**:
  é biblioteca de protocolo, usá-la direto é reescrever o wuzapi.
- **Decisão 1 (de quem é o número) resolvida:** cada empresa conecta o
  próprio, com QR na tela de integrações. É o que a referência faz e é o
  que faz sentido num SaaS.
- **Decisão 3 (onde roda) continua aberta, e é o bloqueio real.** O dono
  ainda não vai manter VPS. Então o provedor entra atrás da interface com
  implementação falsa, e o cartão de integração **diz que o canal está
  desligado** — sem servidor apontado, sem teatro de conexão.

**O que precisa ser decidido antes de escrever qualquer código**

1. **De quem é o número.** Um número da plataforma avisando o dono da
   empresa sobre a assinatura é uma coisa. Cada cliente conectando o próprio
   número para falar com o cliente final dele é outra, e muda a arquitetura:
   exige uma instância por workspace, QR code na tela de configurações,
   estado de conexão visível e reconexão quando cair.
2. **Oficial ou não oficial.** Para avisar três clientes sobre vencimento, o
   não oficial serve. Para a comunicação que o cliente final recebe, um
   banimento derruba todo mundo ao mesmo tempo.
3. **Onde roda** — este é o item que muda a infraestrutura. Hoje tudo é
   serverless (Vercel) mais Supabase. Sessão de WhatsApp é processo com
   estado que precisa ficar de pé, com volume para a sessão e backup dela:
   pede VPS ou contêiner (Fly, Railway, servidor próprio). Não hospeda na
   Vercel.
4. **Consentimento e saída.** Telefone é dado pessoal e mensagem automática
   sem opt-in é problema de LGPD antes de ser problema de reputação do
   número. Precisa de "quero receber" gravado por destinatário e de um
   "pare" que realmente pare.
5. **O que enviar.** Aviso interno já existe (sino e chat). O WhatsApp é para
   quem **não** abre o sistema. Lista mínima que se sustenta: vencimento e
   confirmação de cobrança da assinatura, prazo de demanda para o
   responsável, e demanda concluída para o cliente final.

**Como encaixa no que já existe**

- Telefone já está em `workspace.contact_phone` (cobrança), `client.phone`
  (CRM) e `affiliate.phone`. **`app_user` não tem telefone** — avisar alguém
  da equipe exige campo novo e consentimento por pessoa, não por workspace.
- **Fila no banco, não disparo direto.** Uma `message_outbox` com destino,
  situação, tentativas e `sent_at`, com índice único por (evento, destino,
  período) — a mesma decisão que a 0049 tomou para cobrança. Webhook
  reenviado não pode virar segunda mensagem para o cliente.
- O disparo é o cron que já existe (`vercel.json` mais rota autenticada por
  `CRON_SECRET`) drenando a fila, e um webhook de volta para registrar
  entrega e leitura.
- O provedor entra **atrás de uma interface**, como `PaymentGateway` em
  `lib/billing/gateway.ts`, com implementação falsa para testar sem número
  conectado. Trocar Evolution por wuzapi — ou pela Cloud API, se o risco de
  banimento pesar — não deve mexer em nada acima da interface.

**Automações de WhatsApp — o que dispararia (a definir com uso real)**

O canal é a parte cara; decidir o que mandar é a parte que erra. A lista
abaixo é ponto de partida, não escopo fechado, e cada item só entra depois
que alguém disser que sente falta:

- **Cobrança**: aviso três dias antes do vencimento, no dia, e recibo quando
  o pagamento entra. É o que o `finance_entry` já sabe responder.
- **Prazo de demanda** para o responsável — mas concorrendo com o sino, que
  já avisa. Só vale para quem não abre o sistema todo dia.
- **Demanda concluída** para o cliente final, se ele topar receber.
- **Negociação parada**: card sem movimento no funil há X dias. Este é o que
  mais parece útil e o que mais depende de dado real para calibrar o X.

Regra que vale para todos: **frequência é o inimigo**. Automação que dispara
demais treina a pessoa a ignorar, e aí a mensagem que importava chega no
mesmo balde. Um disparo por evento, sem repetição, e um jeito óbvio de
desligar por destinatário.

---

## 12. E-mail marketing — para desenvolvimento

Pedido pelo dono em 21/ago/2026, a partir do painel de referência. **Não
existe nada disso**, e o buraco começa antes do marketing: o sistema **não
envia e-mail nenhum** hoje — o convite de equipe é por link copiado à mão.

A ordem que faz sentido, e ela importa:

1. **E-mail transacional primeiro.** Convite, aviso de cobrança, recibo. É o
   que já tem gatilho no sistema e o que quebra menos quando falha. Exige um
   provedor (Resend é o registrado no roadmap desde a E18), um domínio
   verificado e SPF/DKIM configurados.
2. **Modelos com a marca do cliente** — o painel de referência chama de
   "Modelos de e-mail". Só depois do item 1, porque modelo sem envio é
   editor de texto.
3. **Disparo em massa por último**, e com cuidado: lista, segmento, descadastro
   obrigatório, e reputação de domínio. Mandar campanha do mesmo domínio que
   manda cobrança é como perder as duas coisas de uma vez — o padrão é
   subdomínio separado para marketing.

**O que decidir antes**: de quem é a lista (cada workspace tem a sua, e o
cliente do seu cliente não pode aparecer para outro workspace); se o envio
sai do nosso domínio ou do domínio do cliente (o painel de referência oferece
SMTP próprio, e isso muda quem responde pela reputação); e o que fazer com
quem descadastra — a exclusão precisa valer para toda a plataforma, não só
para a campanha.

**Custo escondido**: e-mail marketing traz consigo métricas (abertura,
clique, rejeição), e métrica exige rastreio, que exige decidir o que é
aceitável rastrear. Nada disso é código difícil; é decisão que, tomada
errado no começo, contamina a base inteira.

---

---

## 13. Ambiente de desenvolvimento

O Next avisa `Slow filesystem detected` (468ms num benchmark que costuma dar
dezenas de milissegundos) — o projeto está num disco lento. Isso já custou
boot de 17s, build de 4min e dois travamentos do runner de teste por processo
órfão. Mover `.next` ou o projeto para o SSD antes de investigar lentidão
como se fosse problema de código.

---

## 14. Testes pendentes

`docs/testes-pendentes.md` lista o que foi construído e não pôde ser
verificado rodando. O item mais importante é o isolamento da conversa direta
com dois usuários logados — o único com consequência de privacidade e o
único impossível de provar com uma sessão só.

---

## 15. Barra lateral e porta de entrada (21/ago/2026)

**A barra lateral ficou grande demais.** Medido num notebook de 1366×768,
antes da mudança: navegação 502px, rodapé 147px, e **34 pixels para doze
setores** — dava para ver um de cada vez. O setor é a espinha do produto
(toda demanda pertence a um) e era o único bloco que cedia espaço.

Três mudanças, todas de arrumação, nenhuma de comportamento:

- **Grupo "Comercial" recolhível** (Clientes, Funil, Serviços e, para quem
  administra, Financeiro e Contratos). São telas de entrar, resolver e sair
  — não de ficar. O estado vai num **cookie**, não em localStorage: o
  servidor lê antes de renderizar e o grupo não abre e fecha na frente da
  pessoa. Os atalhos `6` e `7` continuam valendo com o grupo fechado.
- **"Buscar" saiu da lista.** O campo já está na barra superior, com o mesmo
  atalho `/`. Item de menu que duplica um campo visível gasta uma linha.
- **"Plataforma" foi para o menu da conta**, na barra superior — só o dono da
  plataforma o vê e o usa raramente.
- **Setores ganharam `min-h`**, para nunca voltarem a ser o único bloco
  espremido.

Depois: navegação **289px**, setores **297px** — sete visíveis em vez de um.

**Bloqueio de cadastros** (migration 0061). Interruptor no painel da
plataforma, com um cuidado que dá forma ao desenho: **quem você convida
também precisa criar conta.** Um bloqueio ingênuo no trigger fecharia a
porta na cara do time dos seus clientes, e o sintoma apareceria dias depois,
do lado de quem não consegue explicar o erro. A regra é: porta fechada
recusa quem chega do nada e **deixa passar quem tem convite pendente para
aquele e-mail**.

Consequência que está escrita na própria tela: com os cadastros fechados,
**convite por link aberto (sem e-mail) para de criar conta nova** — não há
como o banco saber, na hora de criar o usuário, que ele carrega um token.
Convide pelo e-mail enquanto a porta estiver fechada.

A mensagem também foi traduzida. O Supabase engole o texto do trigger e
devolve "Database error creating new user", que parece defeito; a tela de
login consulta `/api/signups` (rota pública, devolve um booleano só) e, se a
porta estiver mesmo fechada, troca por uma frase que diz o que houve. Falha
de verdade continua aparecendo como falha.

---

## 16. Configurações em abas (21/ago/2026)

A tela era uma coluna só e virou rolagem sem fim: identidade da organização,
modelos de contrato, equipe, auditoria e Google Agenda empilhados. Agora cada
aba é um assunto — Geral, Assinatura, Notificações, Equipe, Modelos de
contrato — e quem entra para mexer numa coisa não passa pelas outras quatro.
Voltando do Google, a aba certa abre sozinha.

**Assinatura** mostra situação, plano, fim do teste e acesso liberado, e traz
o seletor de planos junto. A tela diz, com todas as letras, que **a cobrança
automática ainda não está ligada** — prometer boleto numa tela que não emite
boleto seria pior do que não ter a tela.

**Notificações** (migration 0062) dá a cada pessoa seis interruptores: três
para evento gravado (menção, atribuição, comentário) e três para alerta
calculado (prazos, contratos, financeiro). Duas decisões:

- **A preferência é por pessoa, não por workspace.** Quem participa de duas
  empresas não decide duas vezes que não liga para aviso de contrato.
- **Filtra a exibição, não a gravação.** O evento continua sendo gravado —
  quem foi mencionado foi mencionado. Desligar é "não me mostre"; religar
  traz o histórico de volta em vez de revelar um buraco. Alerta de prazo nem
  gravado é: é calculado na leitura, então desligar é não calcular.

Não há linha no banco até alguém mexer num interruptor: quem nunca abriu a
tela recebe tudo, e o banco não guarda uma linha por usuário para dizer "sim"
seis vezes.

**O que veio do painel de referência e ficou de fora, com motivo**: alterar
senha (o login é link mágico e Google — não existe senha), idioma e moeda (o
produto é pt-BR e BRL; seletor com uma opção é mobília), SMTP e modelos de
e-mail (não enviamos e-mail nenhum ainda — ver seção 12), integrações de
pagamento além do EFI, e a aba de "Atualizações" (changelog), que só se
sustenta com disciplina de manutenção a cada release.

---

## 17. Cadastro com senha (24/ago/2026, migration 0063)

O dono pediu login e senha no lugar do link mágico. Concordei, e o motivo é
mais forte que preferência: **o link mágico depende de e-mail chegar**, e
esse é o canal mais frágil do sistema — não há provedor configurado, e o
SMTP embutido do Supabase é limitado a poucos envios por hora. Cada cadastro
novo dependia de uma entrega que podia não acontecer.

**A contrapartida, registrada porque morde depois:** senha sem e-mail
confiável é senha sem recuperação. Por isso o link mágico **continua**, como
caminho de "esqueci minha senha" — tirá-lo deixaria quem esquece sem volta.

**Descoberta que mudou o desenho:** a confirmação de e-mail está LIGADA no
projeto (`mailer_autoconfirm: false`, lido em `/auth/v1/settings`). Com ela
ligada, `signUp` não devolve sessão e o cadastro continua dependendo de
entrega. O formulário foi escrito para funcionar **nos dois modos**: se vem
sessão, grava o perfil na hora e leva para os planos; se não vem, mostra
"confirme seu e-mail" e os dados viajam nos metadados do usuário até o
primeiro login. Desligar o interruptor no painel do Supabase passa a valer
sem mexer em código.

Os dados vão para `workspace_profile`, que já era a identidade que sai nos
contratos — não criamos um segundo lugar para o mesmo CNPJ. A 0063 só
acrescentou `document_type` (a coluna `document` nasceu como CNPJ e agora
guarda CPF também), a tabela `terms_acceptance` (que grava **qual versão** e
quando, porque um booleano "aceitou" é inútil quando o texto muda) e
`app_user.onboarding_completed_at`, com backfill para ninguém que já usa o
sistema acordar preso numa tela de cadastro.

**Quem entra pelo Google** cai em `/completar-cadastro` e preenche os mesmos
dados. O porteiro está no layout de `(app)`.

**Os termos são RASCUNHO**, escritos por quem não é advogado, com tarja no
topo dizendo isso. Existem para o cadastro não apontar para uma página vazia
— e porque é a única parte disto com consequência jurídica. Precisam ser
revistos antes de o sistema ser oferecido comercialmente.

**Regra da senha**: mínimo de dez caracteres, letra, número e caractere
especial. O mínimo existe porque **comprimento protege mais que
composição** — exigir só a composição empurra todo mundo para a mesma senha
curta com um `@` no meio, que é o padrão que os ataques testam primeiro.

---

## 18. Aprovação do cliente no link público (24/ago/2026, migration 0064)

O elo que faltava. O link da 0046 mostrava a demanda e contava as aberturas,
mas quem abria não tinha como responder — a aprovação acontecia no WhatsApp
e sumia. Agora o cliente aprova ou pede ajuste, com comentário, e quem
responde pela demanda recebe no sino.

Quatro decisões:

- **É histórico, não estado.** O ciclo real é enviar, pedir ajuste,
  corrigir, enviar de novo, aprovar. Guardar só "aprovado sim/não" apagaria
  o pedido de ajuste, que é justamente o que explica por que a peça mudou. O
  estado atual é derivado da última linha, como "atrasada" e "vencido".
- **Quem escreve é a função, não o visitante.** A página roda sem usuário;
  dar policy de insert para `anon` abriria a tabela. `record_task_approval` é
  security definer, valida o token e faz uma coisa só — mesmo desenho do
  `register_share_view`.
- **O nome é o que a pessoa digitar**, e não é identificação. Quem abre o
  link é anônimo por definição; pedir o nome é cortesia para quem lê depois.
  Ninguém deve tratar esse campo como prova.
- **Repetição imediata não vira linha nova**: a mesma decisão, do mesmo
  link, dentro de um minuto, é ignorada. Clique duplo não enche o histórico.

A notificação tem tipo próprio (`aprovacao`) e interruptor próprio nas
preferências — resposta de cliente não é comentário de colega.

---

## 19. Instagram: agendar e publicar — o que descobri antes de começar

Pedido pelo dono em 24/ago/2026. **Nada foi construído**; o que segue é o
levantamento que muda o plano.

**1. A API do Instagram não agenda.** Não existe parâmetro de "publicar às
15:30" na API de publicação da Meta. O agendamento que existe é o do
Business Suite, na interface deles, e não é exposto para aplicativos. Então
**o agendamento é nosso**: guardar data e hora e ter um trabalho periódico
publicando na hora certa. Não é detalhe — é o que define a arquitetura.

**2. App Review é um portão, e a referência também não passou por ele.** No
print que o dono mandou, o produto de referência pede _"seu usuário ou ID do
Facebook… para cadastrar você como testador no app da Meta"_. Só se cadastra
testador quando o app está em modo de desenvolvimento; depois da revisão,
qualquer pessoa conecta sozinha. O "beta com fila" é a forma elegante de
dizer que existe teto de testadores. Nós vamos pelo mesmo caminho: app da
Meta, verificação de negócio, política de privacidade pública e revisão.

**3. Exigências que geram suporte**: a conta precisa ser Instagram
profissional vinculada a uma página do Facebook (conta pessoal não publica
por API), e a mídia precisa estar numa URL que a Meta consiga buscar —
nosso bucket é privado, então será URL assinada com validade suficiente.

**4. Token de 60 dias** que precisa de renovação, mesma classe de trabalho
da integração com o Google Agenda.

**5. A frequência do cron decide se o agendamento por hora existe.** No
plano Hobby da Vercel, tarefa agendada roda uma vez por dia — o que torna
"publicar às 15:30" impossível. No Pro dá para rodar de minuto em minuto. Se
for Hobby, o disparador precisa ser externo (GitHub Actions chamando a rota
autenticada por `CRON_SECRET` resolve, de graça). **A conferir antes de
construir a fila.**

**Ordem combinada com o dono**: aprovação no link público primeiro (feita,
seção 18); depois o modelo de publicação com fila e publicador falso, atrás
de uma interface como o `PaymentGateway`; e o plugue da Meta por último,
quando houver app, conta profissional e revisão aprovada.

---

## 20. Instagram — BLOQUEADO na formalização da empresa (24/ago/2026)

Publicar no Instagram a partir da demanda aprovada, com data e hora, e
devolver relatório do que foi publicado. É um baita diferencial: nenhuma
das ferramentas que o dono usou como referência fecha o ciclo
briefing → aprovação do cliente → publicação → métrica no mesmo lugar.

**O bloqueio, decidido pelo dono em 24/ago:** a integração com a Meta não
sai do modo de desenvolvimento sem **verificação de negócio**, e a
verificação exige empresa formalizada com CNPJ. O CNPJ só vem quando o
sistema começar a ser vendido oficialmente. Enquanto isso, qualquer
trabalho no plugue da Meta é código que ninguém pode usar — só o dono do
app e os testadores cadastrados na mão.

Isso apareceu na prática: o próprio painel avisou que o "Login do Facebook
para Empresas" exige acesso avançado ao `public_profile`, e conceder acesso
avançado é onde a verificação é cobrada.

**O que foi escrito e depois REMOVIDO de propósito** (migrations 0065 e
0066, no histórico do git de 24/ago):

- `/api/meta/data-deletion` — o retorno de exclusão de dados que a Meta
  exige e testa durante a revisão. Conferia a assinatura com a chave
  secreta em tempo constante e recusava sem a chave configurada.
- `/exclusao-de-dados` — a página de acompanhamento que esse retorno
  aponta.
- `meta_deletion_request` — a tabela por trás das duas (criada na 0065,
  derrubada na 0066).
- `META_APP_ID`, `META_APP_SECRET` e `META_REDIRECT_URI` no `.env.example`.

Saíram porque endpoint público sem integração atrás é superfície exposta
sem dono, e porque a política de privacidade não pode descrever coleta de
dados que não acontece — isso é promessa falsa ao cliente, não preparação.
Está tudo a um `git show` de distância quando voltar.

**O que FICOU, porque vale por si:** `/privacidade`, sem a seção da Meta.
Um produto que cobra e guarda CPF/CNPJ precisa de política de privacidade
com ou sem Instagram. Continua RASCUNHO jurídico, como os termos.

**Também já feito e fora do sistema:** a URI de redirecionamento está
cadastrada no app da Meta (`https://tarefafacil.vercel.app/api/meta/callback`),
em modo estrito. Se o domínio virar um próprio, precisa ser refeita lá.

**O caminho, quando o CNPJ existir**, na ordem:

1. Verificação de negócio no Gerenciador de Negócios da Meta.
2. Acesso avançado ao `public_profile`.
3. Produto Instagram adicionado — e a decisão que ficou em aberto: se o
   painel oferecer **"Instagram com Login do Instagram"**, o cliente conecta
   **sem precisar de página do Facebook**, o que remove a maior fonte de
   suporte da função.
4. App Review das permissões de publicação e de métricas.
5. Restaurar a exclusão de dados e a seção da privacidade (0065 no git).
6. Só então a fila com publicador falso e, por último, o plugue real.

**Limites da API que já pesam no desenho** e não mudam com CNPJ: a Graph
API **não agenda** — quem agenda é a nossa fila, que publica na hora certa;
são 50 publicações por conta a cada 24h; e o token de página dura 60 dias,
então precisa de renovação automática antes de vencer.

## 21. Recebimento por empresa — o cliente cobra os clientes dele (24/ago/2026)

Pedido pelo dono em 24/ago, a partir das telas de integração do dgflow, e
descrito por ele como o item mais importante da leva: **cada empresa conecta
a própria conta e o dinheiro cai lá**, por PIX, boleto e cartão.

**Não confundir com a seção 10.** Lá o EFI é a plataforma cobrando os
assinantes dela — uma credencial só, do dono, no ambiente. Aqui é cada
workspace cobrando os clientes dele — uma credencial **por empresa**, que a
empresa mesma cadastra. São duas integrações com o mesmo nome e naturezas
opostas: uma é infraestrutura da plataforma, a outra é dado do inquilino.

**A ordem, decidida pela dificuldade de conectar, não pela de programar**

1. **Mercado Pago e Asaas** — só um token. PIX, boleto e cartão; o Asaas
   ainda faz divisão de pagamento, que é o mais próximo do uso de agência.
2. **EFI, Banco Inter e Sicredi** — exigem certificado mTLS (`.p12` no EFI,
   `.crt` + `.key` nos bancos), conta PJ ativa e liberação pelo gerente da
   agência. O trabalho aqui não é o código: é o suporte a cada cliente que
   cola o certificado errado. Só depois de alguém pedir.

**O que precisa ser resolvido antes de guardar a primeira credencial**

- **Onde ficam.** O precedente é `google_connection` (0007): RLS ligada, zero
  policy, só a chave secreta lê. Serve, mas ali é token de agenda. Aqui é a
  chave que movimenta dinheiro de terceiro, e o cartão de crédito do cliente
  final do cliente. Vale decidir se entra cifragem em coluna (pgsodium /
  Vault) em vez de confiar só na cifra em disco do Supabase — e a resposta
  provavelmente é sim.
- **Quem pode ver e trocar.** Cadastrar gateway é ação de dono, não de
  membro. Precisa de `has_role` e de linha na auditoria, como contrato e
  financeiro já têm.
- **Sandbox x produção** por integração, como na referência. Um cliente
  testando com credencial de produção emite cobrança de verdade.
- **Webhook de retorno** com verificação de assinatura e a mesma disciplina
  de idempotência da 0049: reenvio não pode virar segunda baixa.

**Entregue em 24/ago: Mercado Pago e Asaas** (migration 0067)

`payment_gateway`, uma linha por (workspace, provedor). A tela vive na aba
Integrações, com formulário de chave, ambiente e conferência antes de salvar.

- **A credencial é cifrada pela aplicação** (`lib/crypto/secretBox.ts`,
  AES-256-GCM, chave em `CREDENTIAL_ENCRYPTION_KEY`). A pergunta aberta era
  se bastava a cifra em disco do Supabase; a resposta foi não. Cifra em
  disco protege o disco — quem tiver a chave secreta do projeto, ou um
  backup, leria o token e passaria a emitir cobrança em nome do cliente.
  Sem a chave configurada o servidor **recusa salvar**, em vez de guardar em
  texto claro "por enquanto". Verificado: o banco não guarda o token legível
  e o cliente não lê a tabela.
- **A conferência acontece antes de guardar**, e distingue três causas:
  credencial errada, ambiente trocado e provedor fora do ar. Só 401 e 403
  acusam a credencial. Dizer "token inválido" num 500 faz a pessoa revogar
  uma chave que estava boa, gerar outra e falhar de novo.
- **Ambiente é conferido pelo prefixo, antes da rede.** `TEST-` x `APP_USR-`
  no Mercado Pago, `hmlg` na chave do Asaas. Chave de produção cadastrada
  como sandbox emite cobrança de verdade para o cliente final de alguém — e
  o provedor não reclamaria, porque para ele a chave é válida. É o erro mais
  caro destes conectores e o único que só nós podemos pegar.
- **O token nunca volta para o navegador**, nem mascarado. Trocar a chave é
  colar a nova; não há campo pré-preenchido para editar.
- **`write_audit_as` nasceu aqui.** `write_audit` lê `auth.uid()`, que é nulo
  na conexão da chave secreta — o gatilho de auditoria derrubaria toda
  tentativa de salvar (`summary` é `not null` e a concatenação viraria nulo).
  A nova função recebe o autor por parâmetro e **não é executável por
  `authenticated`**: se fosse, daria para forjar linha em nome de outro.

**O que ficou aberto**

- **Qual gateway emite a cobrança** quando a empresa tiver os dois ligados.
  Não há cobrança ainda; inventar um "padrão" agora seria adivinhar.
- **Rotação da chave de cifra.** O formato já é versionado (`v1.`), mas não
  existe rotina de reencriptar. Perder `CREDENTIAL_ENCRYPTION_KEY` hoje
  significa todos os clientes reconectarem.
- **Webhook de retorno** com verificação de assinatura e a idempotência da
  0049 — é o que falta para o dinheiro entrar sozinho no `finance_entry`.
- **EFI, Banco Inter e Sicredi** seguem em "em breve": exigem mTLS, e o
  trabalho ali é suporte, não código.

**Onde isso mora na tela**

A aba **Integrações** em Configurações, com a grade agrupada
(`lib/integrations/catalog.ts` + `components/integrations/`). Google Agenda,
Mercado Pago e Asaas conectam; o resto aparece como "em breve". Cada cartão
desses é promessa visível ao cliente — não entra nada ali que não tenha item
neste roadmap.

---

## 22. Painel administrativo — repaginação (27/ago/2026, migration 0072)

Especificação entregue pelo dono em 27/ago/2026 (34 seções) mais uma imagem
de referência. A seção 9 deste documento descreve o painel antigo; isto aqui
é o que mudou e o que ficou faltando.

### Decisões tomadas

- **O painel saiu de dentro do grupo `(app)`.** Ele morava lá e por isso
  herdava a casca do cliente: barra lateral com os SETORES da empresa do
  administrador, atalhos do quadro, painel de detalhe de demanda. Além de a
  especificação (4) proibir misturar os dois ambientes, havia um efeito
  prático pior — o layout de `(app)` exige que o usuário tenha um workspace e
  barra quem está com acesso vencido, então um administrador da plataforma
  sem empresa própria não conseguia abrir o painel. Agora `app/admin/` tem
  layout próprio e a única exigência é ser admin da plataforma.
- **O painel é VERDE, o app continua azul.** O `CLAUDE.md` fixa azul como
  marca e reserva verde para dado financeiro. A especificação pede verde como
  assinatura. Resolvido separando os papéis: empresa escolhe entre os sete
  temas (0071); a administração é o produto visto por dentro e usa verde
  fixo, o que satisfaz de quebra o "ambiente visualmente separado" da seção 4. O atributo é fixado por efeito no `<html>` (`AdminBrand`) porque portal
  de Radix renderiza preso ao `<body>` — num wrapper interno, menu e diálogo
  voltariam à cor do cliente. O cookie da empresa não é tocado.
- **Métricas fora do componente**, em `lib/admin/metrics.ts`, com a fórmula
  escrita ao lado do código e repetida na dica de cada cartão. Número de
  painel sem definição vira discussão.
- **Nenhuma dependência nova.** `LineChart` e `Sparkline` já existiam.
- **`audit_log.workspace_id` passou a aceitar null** (0072) para registrar
  ação de plataforma. Evento sobre uma empresa grava `workspace_id = null` e
  guarda a empresa em `entity_id`, que não tem chave estrangeira — senão o
  registro morreria no cascade junto com a empresa excluída.

### O que NÃO foi feito, e por quê

Nada disto virou número falso na tela; a restrição 33 da especificação proíbe
simular implementação concluída.

- **Falhas de webhook e eventos suspeitos** (8.6): `payment_event` só guarda
  o payload recebido, sem estado de erro, e não existe tabela de eventos de
  segurança. Precisa de coluna de status no webhook antes.
- **Sino de notificações** (7.2, 22): depende de uma tabela de eventos
  administrativos que não existe.
- **Assinaturas e Cupons**: telas declaradas "em breve" no menu, com a
  página explicando o que falta. Assinaturas precisa de idempotência nas
  ações financeiras e de estados que o schema não separa (cancelamento
  agendado, tolerância, pausa). Cupons precisa da tabela e da regra de
  aplicação na cobrança — cupom que o painel cria e o checkout ignora é pior
  que cupom nenhum.
- **Estados "cancelamento agendado" e "excluída logicamente"** (9.2):
  faltam as colunas `cancel_at` e `deleted_at`.
- **RBAC administrativo** (17): hoje é uma lista de e-mails em
  `PLATFORM_ADMIN_EMAILS`, tudo ou nada. Os quatro papéis (superadmin,
  suporte, financeiro, analista) pedem tabela de administradores e checagem
  por operação no servidor.
- **Página detalhada de empresa e de usuário** (9.6, 10.3) e as ações
  sensíveis com motivo (9.7, 10.4): a rota `/admin/empresas/[id]` já é
  linkada pela tabela de recentes e ainda não existe.
- **Data real de cancelamento**: o churn usa `subscription.updated_at` como
  aproximação. Corrigir pede uma coluna `canceled_at`.
- **Último acesso** vem de `auth.users.last_sign_in_at`, varrido em páginas
  de 50 com teto de 1000 usuários. Acima disso, o certo é uma coluna
  `last_seen_at` em `app_user` gravada no login.
- **Histórico de suspensão e vencimento**: o gráfico de empresas ativas lê o
  estado de HOJE para todos os dias do período, porque o banco não versiona
  esses dois campos. Está dito na dica do cartão.

### Rodada 2 — detalhe da empresa e ações com motivo (27/ago/2026, migration 0073)

**O que passou a existir**

- Página `/admin/empresas/[id]` com cinco abas de dado real: visão geral,
  membros, assinatura, cobranças e observações.
- Nove ações administrativas com **motivo obrigatório validado no servidor**
  e evento de auditoria com autor, data e antes/depois.
- Observação interna (`admin_note`): o que a plataforma anota sobre a empresa
  e o cliente nunca vê. Tabela própria em vez de coluna `notes` no workspace,
  porque nota tem autor e data — sobrescrever apaga o histórico.
- **Excluir virou lógico.** Antes o botão fazia `delete` no workspace, que
  cascateia para demandas, anexos, conversas e a própria auditoria da
  empresa: irreversível, sem motivo e sem prazo de arrependimento. Agora
  marca `deleted_at`, suspende junto (para tirar da tela quem já está com
  sessão aberta) e fica restaurável. A remoção física continua na rota mas
  exige 30 dias de quarentena mais motivo, e grava a auditoria ANTES do
  delete — depois seria tarde, a linha morre no cascade.

**Verificado contra o banco real, sem alterar nada**

Motivo ausente, motivo curto, ação inventada, nome de confirmação errado e
remoção física sem exclusão prévia: os cinco recusados pelo servidor (400,
400, 400, 400, 409). Com a chave publishable — a mesma do navegador do
cliente — ler observação devolve zero linhas, escrever dá 42501, forjar
evento de auditoria dá 42501 e mexer em `deleted_at` dá 42501.

**Decisões**

- A exclusão lógica é filtrada em UM lugar: a lista de workspaces do layout
  de `(app)`, que é o que decide onde a pessoa entra. Os outros 24 pontos que
  consultam `workspace` leem uma empresa específica por id, já autorizada por
  associação — filtrar em todos seria superfície grande sem ganho.
- `getCompany` faz uma chamada de autenticação por membro. É o certo aqui
  (são poucos por empresa e `getUserById` é exato); a varredura paginada só
  compensa na listagem geral.

**O que ficou faltando nesta rodada**

- **Não existe como apagar uma observação interna.** Uma nota escrita na
  empresa errada fica lá. Precisa decidir se some de vez ou se ganha um
  "arquivada", já que o valor dela é justamente ser um registro.
- Ações de membro (reenviar convite, remover, transferir propriedade) e a
  aba Segurança (sessões, forçar logout) — ambas dependem de dado que não
  existe ou de mutação ainda não escrita.
- A auditoria não filtra por empresa. Hoje o filtro é escopo, ação e texto;
  filtrar por empresa pede o seletor e o índice.

### Rodada 3 — ações de membro (27/ago/2026, sem migration)

Seis ações na aba Membros, todas com motivo obrigatório e auditoria: alterar
papel, remover da empresa, transferir propriedade, bloquear, desbloquear e
gerar link de senha. Nenhuma migration — tudo sai de `workspace_member` e da
API de autenticação do Supabase.

**A trava do dono.** Nenhuma ação pode deixar a empresa sem dono: remover ou
rebaixar a única pessoa dona é recusado com 409. Empresa sem dono é um beco —
`owner_user_id` fica órfão, a cobrança perde responsável e ninguém tem
permissão para convidar alguém de volta. A saída é transferir a propriedade,
que promove o novo dono ANTES de rebaixar o antigo: se a segunda escrita
falhar sobram dois donos (chato, consertável pela tela), enquanto a ordem
inversa deixaria zero.

**"Dono" não está no seletor de papel.** Aceitar `owner` ali criaria empresa
com dois donos por um select adulterado; o servidor recusa o valor.

**O link de senha não vai para a auditoria.** Registra-se que um link foi
gerado, para quem e por quê — o link em si, não: quem o tem define a senha, e
log é lido por mais gente e guardado por mais tempo do que a ação dura. A
tela avisa em vermelho que o link vale como senha.

**O que a especificação 10.4 pede e NÃO foi feito**

- **Forçar logout sem bloquear.** O SDK só expõe `signOut(jwt)` e o
  administrador não tem o token da pessoa. Bloquear já derruba a sessão na
  renovação, então é hoje o caminho honesto. Um logout que não bloqueia
  precisa do endpoint de sessões do GoTrue, chamado na mão.
- **Reenviar verificação de e-mail e reenviar convite por e-mail.** O projeto
  não envia e-mail: convite aqui é LINK (`/convite/<token>`), copiado e
  entregue pelo dono. Botão que promete enviar e não envia é pior que botão
  nenhum. Entra junto com SMTP.

**Verificado**

Sete recusas do servidor, nenhuma alterando nada: remover o único dono 409,
rebaixar o único dono 409, promover a `owner` pelo select 400, bloquear sem
motivo 400, ação inventada 400, usuário que não é membro 404, sem userId 400.
Conferido depois no banco: papéis, dono e bloqueios intactos.

**Não exercitado ao vivo:** as mutações de membro que dão certo. Cada uma
mexeria no acesso de uma pessoa real que está usando o sistema — remover,
bloquear ou trocar o papel do Igor não é teste, é consequência. A estrutura é
idêntica à da ação de empresa, essa sim exercitada de ponta a ponta. Testar
os caminhos felizes pede uma empresa descartável.

### Rodada 4 — módulo Assinaturas (27/ago/2026, migration 0074)

**A descoberta que definiu o escopo desta rodada**

`lib/billing/cycle.ts` está completo e testado — ciclo, carência, decisão de
cobrar, situação derivada — e **não tem nenhum chamador**. `subscription_charge`
e `payment_event` estão vazias; `payment_gateway` também. O motor de cobrança
foi construído e nunca ligado.

Por isso a tela NÃO tem nova tentativa de cobrança, reenvio de link de
pagamento nem reembolso: as três falam com um fluxo que não roda. E por isso
a própria tela avisa, em bloco fixo, que nenhuma cobrança é gerada e que
"próxima cobrança" é o ciclo calculado a partir do dia escolhido — não uma
fatura existente.

**Sobre idempotência**, que era o risco levantado antes de começar: as três
ações desta rodada escrevem um ESTADO, não somam um evento. Cancelar duas
vezes deixa cancelada; agendar duas vezes deixa a última data; reativar duas
vezes deixa ativa. Nenhuma cobra ninguém. Chave de idempotência entra junto
com a primeira ação que fale com provedor de pagamento — cerimônia sem risco
é só código a mais para manter.

**Migration 0074**

- `subscription.cancel_at` — cancelamento agendado. Sem esta coluna, cancelar
  só podia ser imediato, e quem cancelasse no meio do ciclo pago perdia o que
  já tinha pago.
- `subscription.canceled_at` — **conserta o churn.** Ele usava `updated_at`,
  que é "última alteração de qualquer coisa": uma assinatura cancelada em
  março e tocada de novo em agosto contava como churn de agosto. A ressalva
  saiu da dica do cartão. As linhas já canceladas receberam `updated_at`
  como aproximação declarada.

**Bug latente corrigido de quebra: duas definições de MRR**

O cartão da visão geral exigia linha em `subscription` com status ativa; a
listagem de empresas bastava a empresa não estar em teste nem suspensa. Os
números batiam POR ACASO — as empresas sem assinatura estão em teste ou num
plano de R$ 0. Bastava uma delas ir para o Pro sem assinatura para o cartão
dizer um valor e a tabela outro. Agora existe `contaNoMrr`, uma função só,
usada nos dois lugares.

**Um susto que não era bug**

Na primeira abertura a tela mostrou "Sem assinatura" para todas e MRR zero.
Não era erro de código: o PostgREST ainda servia o schema em cache SEM as
colunas da 0074, então o `select` que as pedia voltava vazio. Minutos depois
o schema recarregou e os mesmos dados apareceram certos. Vale lembrar em toda
migration que adiciona coluna lida logo em seguida.

**Verificado**

Oito recusas do servidor, nenhuma alterando nada: sem motivo 400, motivo
curto 400, ação inventada 400, data no passado 400, data mal formatada 400,
agendar sem data 400, empresa sem assinatura 409, empresa inexistente 404.
Conferido no banco depois: as duas assinaturas seguem ativas, sem datas de
cancelamento.

**Continua faltando** (especificação 11): ciclo anual e vitalício separados
do mensal, cupom aplicado à assinatura, método de pagamento mascarado,
período de tolerância como estado próprio e pausa. Todos dependem de colunas
ou do fluxo de cobrança.

### Rodada 5 — o motor de cobrança ligado (27/ago/2026, sem migration)

`lib/billing/cycle.ts` existia, testado, sem chamador nenhum. Agora tem.

**O que passou a existir**

- `lib/billing/run.ts` — percorre as assinaturas, decide com `decideCharge` e
  grava as faturas do ciclo.
- `lib/billing/settle.ts` — registrar pagamento (que empurra o acesso),
  expirar faturas vencidas e aplicar cancelamentos agendados.
- `lib/billing/provider.ts` — escolhe o modo. Sem provedor configurado, o
  modo é MANUAL.
- Rotas: `/api/admin/billing` (rodar), `/api/admin/billing/charges/[id]`
  (registrar pagamento, cancelar), `/api/cron/cobrar` (diário).
- Tela: simulação linha a linha antes de emitir, e a lista de faturas com
  "registrar pagamento".

**Cobrança MANUAL fecha o ciclo hoje, sem credencial nenhuma**

A EFI precisa de certificado mTLS, que não existe aqui, e escrever um cliente
de provedor que não dá para testar seria pior do que não escrever. Então a
fatura nasce sem QR: o dono envia a cobrança por fora, recebe o Pix, e
registra o pagamento no painel — o que marca a fatura, empurra
`access_expires_at` até o fim do período mais a carência e devolve a
assinatura para ativa. É como a maioria dos SaaS pequenos começa, e não é um
estado provisório envergonhado.

**Quatro travas, porque isto emite dinheiro**

1. **Simulação é o padrão.** A rota só cobra com `simulacao: false` explícito
   E a palavra COBRAR digitada. A tela simula primeiro, sempre, e mostra
   linha por linha quem seria cobrado.
2. **O cron nasce desligado.** Sem `BILLING_AUTO=1` ele roda todo dia,
   calcula tudo e só escreve no log o que faria. Dá para acompanhar por
   semanas antes da primeira fatura sair. O agendamento entra no vercel.json
   agora de propósito: cron criado no dia da decisão estreia sem nunca ter
   rodado.
3. **O gateway falso precisa de DUAS travas** (`BILLING_PROVIDER=fake` e
   `BILLING_FAKE_OK=1`) e é recusado em produção de qualquer jeito. Um fake
   ativo diria "pago" para dinheiro que não entrou, e o acesso seria
   empurrado de graça — sem erro em lugar nenhum.
4. **A idempotência mora no banco**, no índice único
   (workspace_id, period_start) da 0049. Rodar duas vezes não cria duas
   faturas: a segunda esbarra no índice, e o código trata 23505 como "já
   existia", não como erro.

**Ordem de escrita em `registrarPagamento`**, que não é arbitrária: marca a
fatura, empurra o acesso, depois normaliza a assinatura. Se o passo 2 falhar
depois do 1, o cliente pagou e não recebeu acesso — visível, reclamado e
consertável repetindo. Na ordem inversa, o acesso seria empurrado por um
pagamento talvez não gravado, e ninguém reclama de ganhar acesso.

**Verificado, e o que NÃO foi**

A simulação rodou contra os dados reais e acertou: ciclo 01/08→01/09 a partir
do dia de cobrança 1, Pro cobraria R$ 99,00, plano Vitalício de R$ 0 pulado
como "plano gratuito", empresas em teste puladas.

**A emissão real não foi executada.** Ela cria fatura de verdade, e a
decisão de emitir é do dono — não de quem está construindo. O caminho está
pronto e a simulação mostra exatamente o que sairá.

**Continua faltando**: cliente da EFI (precisa de mTLS), webhook de
pagamento — `payment_event` e o índice de unicidade dela já existem para
isso —, reembolso, e o e-mail avisando o cliente de que há fatura aberta.
