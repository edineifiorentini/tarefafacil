-- =====================================================================
-- TarefaFácil — 0047_fix_channel_index
--
-- BUG (achado em uso, 18/ago/2026): não dava para criar grupo nem conversa
-- direta. Erro: duplicate key on chat_channel_geral_idx.
--
-- Causa: a 0038 criou
--     unique (workspace_id) where sector_id is null
-- para garantir UM canal geral por workspace. Na época isso era equivalente,
-- porque só o "Geral" tinha sector_id nulo — todo o resto era canal de setor.
--
-- A 0040 removeu os canais de setor e trouxe grupo e conversa direta, que
-- também têm sector_id nulo. O índice continuou dizendo a mesma coisa em
-- SQL e passou a significar outra em produto: "um canal por workspace".
--
-- Lição embutida no índice novo: a condição agora fala do que a regra
-- realmente é — o canal geral é o de `kind = 'geral'`, não "o que não tem
-- setor".
-- =====================================================================

drop index if exists chat_channel_geral_idx;

create unique index chat_channel_geral_idx
  on public.chat_channel (workspace_id) where kind = 'geral';

-- ---------------------------------------------------------------------
-- BUG (mesmo relato): "meu parceiro me respondeu e não apareceu
-- notificação". Só menção gerava aviso.
--
-- Numa conversa DIRETA a mensagem já é endereçada a você — é o mesmo peso
-- de uma menção, e exigir @nome numa conversa de duas pessoas é absurdo.
--
-- Grupo e Geral continuam sem notificação por mensagem: lá o contador de
-- não lidas da barra lateral é o canal certo. Notificar cada mensagem de
-- um canal coletivo transforma o sino em ruído e faz as menções sumirem no
-- meio.
-- ---------------------------------------------------------------------
alter table public.notification
  drop constraint notification_kind_check;
alter table public.notification
  add constraint notification_kind_check
  check (kind in ('mencao', 'atribuicao', 'comentario', 'mensagem'));

create or replace function public.notify_on_chat_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  actor_name text;
  canal record;
  recipient uuid;
  mencionados uuid[] := coalesce(new.mentioned_user_ids, '{}');
begin
  if new.kind <> 'humano' then
    return new;
  end if;

  select id, name, kind into canal
  from public.chat_channel where id = new.channel_id;

  select coalesce(display_name, email) into actor_name
  from public.app_user where id = new.author_id;

  -- Menções, em qualquer tipo de canal.
  for recipient in select distinct m from unnest(mencionados) as m
  loop
    if recipient is not null and recipient <> new.author_id then
      insert into public.notification
        (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
      values
        (new.workspace_id, recipient, 'mencao', 'chat_channel', new.channel_id,
         new.author_id,
         actor_name || ' mencionou você em ' ||
           case when canal.kind = 'direta' then 'uma conversa' else canal.name end,
         left(new.body, 140));
    end if;
  end loop;

  -- Conversa direta: avisa o outro lado, se ele já não foi avisado pela
  -- menção acima.
  if canal.kind = 'direta' then
    for recipient in
      select user_id from public.chat_channel_member
      where channel_id = new.channel_id and user_id <> new.author_id
    loop
      if not (recipient = any (mencionados)) then
        insert into public.notification
          (workspace_id, user_id, kind, entity_type, entity_id, actor_id, title, body)
        values
          (new.workspace_id, recipient, 'mensagem', 'chat_channel',
           new.channel_id, new.author_id,
           actor_name || ' enviou uma mensagem',
           left(new.body, 140));
      end if;
    end loop;
  end if;

  return new;
end;
$fn$;
