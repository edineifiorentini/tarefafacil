-- =====================================================================
-- TarefaFácil — 0055_chat_reaction
-- Reação de emoji na mensagem do chat.
--
-- Quatro decisões:
--
-- 1. O CONJUNTO É FIXO, e no banco. Reagir é vocabulário curto de propósito
--    — o dono pediu "os mais básicos", não o teclado inteiro. Com a coluna
--    livre, qualquer cliente poderia gravar texto arbitrário e a interface
--    teria de desenhar o que viesse. Acrescentar um emoji depois é uma
--    migration de uma linha; deixar a porta aberta não tem volta.
--
-- 2. A CHAVE É (mensagem, pessoa, emoji). Cada pessoa dá cada reação no
--    máximo uma vez, e o banco garante isso — reagir duas vezes por clique
--    duplo ou por corrida de rede não conta duas.
--
-- 3. `workspace_id` e `channel_id` VÊM JUNTOS. O `workspace_id` é regra do
--    projeto; o `channel_id` é o que deixa a conversa buscar as reações do
--    canal numa varredura de índice, sem juntar com `chat_message` a cada
--    seis segundos. A policy de escrita confere que os dois batem com os da
--    mensagem, então a cópia não tem como divergir.
--
-- 4. Só se escreve a própria reação. `user_id = auth.uid()` no insert e no
--    delete: ninguém reage no lugar de ninguém, nem apaga a reação alheia.
-- =====================================================================

create table public.chat_message_reaction (
  message_id   uuid not null references public.chat_message(id) on delete cascade,
  user_id      uuid not null references public.app_user(id) on delete cascade,
  emoji        text not null check (
    emoji in ('👍', '❤️', '😂', '😮', '😢', '🙏', '👀')
  ),

  workspace_id uuid not null references public.workspace(id) on delete cascade,
  channel_id   uuid not null references public.chat_channel(id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (message_id, user_id, emoji)
);

-- A consulta da conversa: todas as reações do canal aberto.
create index chat_message_reaction_channel_idx
  on public.chat_message_reaction (channel_id);

alter table public.chat_message_reaction enable row level security;

-- Quem enxerga o canal enxerga as reações dele. Mesma porta das mensagens.
create policy chat_message_reaction_select on public.chat_message_reaction
  for select using (public.can_read_channel(channel_id));

create policy chat_message_reaction_insert on public.chat_message_reaction
  for insert with check (
    user_id = auth.uid()
    and public.can_read_channel(channel_id)
    -- O canal e o workspace gravados são os da mensagem, não os que o
    -- cliente mandou. Sem isto, a cópia do item 3 seria palpite.
    and exists (
      select 1 from public.chat_message m
      where m.id = message_id
        and m.channel_id = chat_message_reaction.channel_id
        and m.workspace_id = chat_message_reaction.workspace_id
    )
  );

create policy chat_message_reaction_delete on public.chat_message_reaction
  for delete using (user_id = auth.uid());

-- Sem policy de update: tirar e pôr é a única forma de mudar de reação, e
-- é o que o toque na ficha já faz.
