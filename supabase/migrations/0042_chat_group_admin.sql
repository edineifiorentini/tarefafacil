-- =====================================================================
-- TarefaFácil — 0042_chat_group_admin
-- Fecha o que ficou pela metade na rodada 3 do chat: renomear grupo.
--
-- É RPC e não update direto porque a policy de escrita de canal é só de
-- owner/admin, e quem cria um grupo pode ser membro comum — seria dono de
-- um grupo que não consegue renomear. Aqui a regra fica explícita: renomeia
-- quem criou, ou quem administra o workspace.
-- =====================================================================

create or replace function public.rename_group_channel(canal uuid, nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  ws uuid;
  autor uuid;
begin
  if coalesce(trim(nome), '') = '' then
    raise exception 'o grupo precisa de um nome';
  end if;

  select workspace_id, created_by into ws, autor
  from public.chat_channel
  where id = canal and kind = 'grupo';

  if ws is null then
    raise exception 'grupo não encontrado';
  end if;

  if me is distinct from autor
     and not public.has_role(ws, array['owner', 'admin'])
  then
    raise exception 'só quem criou o grupo ou administra o workspace pode renomear';
  end if;

  update public.chat_channel set name = trim(nome) where id = canal;
end;
$$;

revoke all on function public.rename_group_channel(uuid, text) from public;
grant execute on function public.rename_group_channel(uuid, text) to authenticated;
