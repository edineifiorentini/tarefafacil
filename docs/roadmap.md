# Roadmap

O que ainda não existe, por que ficou para depois e o que precisa ser decidido
antes de começar. `docs/build.md` é o plano das etapas E00–E18 (concluídas);
aqui fica o que veio depois delas.

Ordem dentro de cada bloco é sugestão, não compromisso.

---

## 1. Chat interno da equipe

Pedido do dono em 17/ago/2026. Hoje a conversa sobre uma demanda vive nos
comentários dela; não há lugar para o que atravessa demandas ("alguém pega o
evento de sexta?", "o cliente ligou").

**Escopo pedido**

- Conversa entre membros do workspace;
- Marcações (`@fulano`) integradas às notificações que já existem;
- Aviso automático quando uma demanda ou projeto é criado;
- Aviso automático de tempo do projeto (prazo chegando, estourado);
- Correlatos: anexar arquivo, responder mensagem, marcar como lida.

**O que já está pronto e deve ser reusado**

- `public.notification` + triggers `security definer` (migration 0037) — o
  padrão de "quem escreve é o banco, não o cliente" vale igual para o chat;
- O parser de `@menção` dos comentários (`mentioned_user_ids`);
- O sino, que já separa alerta de evento e já sabe abrir o item clicado.

**Decisões a tomar antes de escrever código**

1. **Onde a conversa mora.** Canal por setor (a barra lateral já organiza o
   trabalho assim) é o candidato natural; canal por projeto e mensagem direta
   entre duas pessoas são escopos adicionais. Escolher um para a primeira
   rodada — os três de uma vez viram um produto dentro do produto.
2. **Tempo real ou não.** Supabase Realtime resolve, mas é conexão aberta por
   aba e entra na conta. A alternativa honesta para uma equipe pequena é
   polling com `refetchInterval` enquanto o chat está aberto. Medir antes de
   assumir que precisa de websocket.
3. **Avisos automáticos: mensagem ou notificação?** "Demanda criada" pode
   virar linha no chat (histórico da equipe) ou notificação no sino (caixa de
   entrada pessoal). Fazer os dois duplica o ruído. Recomendação: aviso de
   criação vai para o canal do setor; aviso de prazo continua sendo alerta
   derivado no sino, porque é estado, não evento.
4. **Retenção.** Chat cresce rápido e nunca é apagado por ninguém. Definir
   janela e índice antes de a tabela ter 100 mil linhas.
5. **Quem lê o quê.** Canal de setor é visível a quem tem o setor; `viewer`
   escreve ou só lê? A RLS precisa da resposta antes da tabela existir.

**Cuidado conhecido:** contagem de não lidas por pessoa por canal é o que
costuma ficar caro. Guardar `last_read_at` por (usuário, canal) e contar por
`created_at >` é mais barato que uma linha de leitura por mensagem.

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

## 3. Fase 9 — qualidade e lançamento

- Testes ponta a ponta no Playwright cobrindo os fluxos críticos;
- Desempenho das queries principais com volume realista;
- Seed controlado e plano de rollback;
- Documentação operacional e checklist de produção;
- Runner de acessibilidade do Storybook — **bloqueado** por um bug de interop
  ESM entre `aria-query` e o Vite; a auditoria manual da E17 cobre por ora.

---

## 4. Dívidas e adiamentos registrados

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
