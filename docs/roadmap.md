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

**Pontas soltas da rodada 3** — o back-end existe, a interface não. Não é
ideia para depois: é função pela metade, e o código morto engana quem ler.

- `add_group_members` e `leave_group_channel` existem como RPC e como
  hook, **sem tela**. Hoje dá para criar um grupo com participantes e nunca
  mais mexer neles, nem sair.
- Renomear grupo não existe em lugar nenhum.
- `useChatUnreadTotal` foi escrito e **não está ligado** ao item "Chat" da
  barra lateral. Sem esse contador, só se descobre mensagem nova abrindo o
  chat — o que anula boa parte do valor de ter chat.

**Rodada 4 — o que ficou de fora**

- Anexo em mensagem (reusar o storage que as demandas já usam);
- **Retenção.** Chat cresce e ninguém apaga. Definir janela antes de a tabela
  passar de algumas dezenas de milhares de linhas;
- O contador lateral olha uma janela de 300 mensagens recentes do workspace.
  É teto de segurança, não paginação: se estourar, a contagem precisa descer
  para o banco;
- **Pendente de teste com duas sessões:** a RLS da conversa direta foi
  escrita e revisada, mas exercitá-la de verdade exige dois usuários logados
  ao mesmo tempo. É o primeiro item a validar em homologação.

---

## 2. Fase 8 — o que falta

A central de notificações saiu (2b7084c). Restam:

- **Link público revogável** (spec §11). Compartilhar uma demanda ou uma visão
  filtrada com cliente externo, sem login: token, validade, revogação e um
  recorte que nunca inclui financeiro. É a peça que falta para o cliente
  acompanhar sem virar membro.
- **Permissões granulares.** Hoje são quatro papéis para o workspace inteiro.
  O spec pede recorte por setor e por cliente, e transferir responsabilidades
  antes de remover alguém.
- **Auditoria de operações sensíveis.** Existe histórico por demanda; falta o
  log de workspace: login, convite, troca de papel, exclusão.
- **Jobs observáveis.** Só faz sentido quando houver trabalho assíncrono real
  — e-mail, renovação do `watch` do Google, limpeza de anexo. Criar a
  infraestrutura antes disso é inventar problema.

## 3. Lacunas contra o MVP do spec (§22)

O spec lista o que considera essencial para o MVP comercial. Quase tudo
existe; falta:

- **Testes críticos.** Não há nenhum teste ponta a ponta. Os três últimos
  defeitos — relógio preso na montagem, painel em UTC contra sino em local,
  aviso apontando para demanda apagada — passaram por 191 testes de unidade
  porque nenhum estava na lógica pura: estavam na ligação entre dado e tela.
  Enquanto essa classe só for descoberta por alguém reparando, toda função
  nova entra com o mesmo ponto cego.
- **Auditoria de operações sensíveis.** Existe histórico por demanda; falta
  o log do workspace (login, convite, troca de papel, exclusão). Está
  listado em §22 como parte do essencial, não como evolução.
- **Recorrências no Financeiro.** Parcela de contrato gera lançamento;
  recorrência própria ("aluguel todo dia 5") não existe.

## 4. Fase 9 — qualidade e lançamento

- Testes ponta a ponta no Playwright cobrindo os fluxos críticos;
- Desempenho das queries principais com volume realista;
- Seed controlado e plano de rollback;
- Documentação operacional e checklist de produção;
- Runner de acessibilidade do Storybook — **bloqueado** por um bug de interop
  ESM entre `aria-query` e o Vite; a auditoria manual da E17 cobre por ora.

---

## 5. Dívidas e adiamentos registrados

Cada item aqui foi uma decisão consciente, não esquecimento.

| Item | Por que ficou para depois |
| --- | --- |
| Prévia A4 paginada + PDF nativo do contrato | A janela de impressão do navegador entrega o PDF hoje. Paginação fiel exige motor próprio. |
| Financeiro rodada 3 (parcelas próprias, recorrência, centro de custo, alertas) | Parcelas de contrato já geram lançamento; o resto só tem valor com uso real para dizer o formato. |
| Gateway de pagamento (EFI Bank) | Depende de conta e homologação. |
| Verificação do app no Google | Exige domínio próprio publicado. |
| E-mail de convite de verdade (Resend) | O convite funciona por link; e-mail é conforto, não bloqueio. |
| `events.watch` do Google em produção | Precisa de URL pública estável. |
| Crons (limpeza de anexo 30d, renovação do watch) | Ver "jobs observáveis" acima. |
| Marketing e onboarding guiado (E18) | Adiado no fechamento da E18. |
| Contador de não lidas no banco | Hoje o chat conta sobre uma janela de 300 mensagens no cliente. Só vira problema com volume. |

---

## 6. Ambiente de desenvolvimento

O Next avisa `Slow filesystem detected` (468ms num benchmark que costuma dar
dezenas de milissegundos) — o projeto está num disco lento. Isso já custou
boot de 17s, build de 4min e dois travamentos do runner de teste por processo
órfão. Mover `.next` ou o projeto para o SSD antes de investigar lentidão
como se fosse problema de código.

---

## 7. Testes pendentes

`docs/testes-pendentes.md` lista o que foi construído e não pôde ser
verificado rodando. O item mais importante é o isolamento da conversa direta
com dois usuários logados — o único com consequência de privacidade e o
único impossível de provar com uma sessão só.
