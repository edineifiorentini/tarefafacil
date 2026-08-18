-- =====================================================================
-- TarefaFácil — 0043_default_sector
-- Workspace novo nascia sem nenhum setor. Como `task.sector_id` é NOT NULL,
-- a primeira coisa que um cliente novo encontrava ao tentar criar uma
-- tarefa era uma frase mandando criar um setor antes — um beco sem saída
-- logo na porta de entrada.
--
-- Agora o workspace nasce com um setor "Geral" e as colunas de quadro dele.
-- As colunas vêm junto de propósito: setor sem coluna deixa o Kanban vazio,
-- e o problema teria só mudado de lugar.
-- =====================================================================

create or replace function public.seed_default_sector(ws uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sector uuid;
begin
  insert into public.sector (workspace_id, name, color, position)
  values (ws, 'Geral', '#2563EB', 0)
  returning id into v_sector;

  -- Mesmas colunas que `useCreateSector` cria pela interface. Se um dia
  -- divergirem, o setor inicial vira um caso à parte sem ninguém perceber.
  insert into public.board_column (workspace_id, sector_id, name, position, is_done_column)
  values
    (ws, v_sector, 'A fazer',   0, false),
    (ws, v_sector, 'Fazendo',   1, false),
    (ws, v_sector, 'Revisão',   2, false),
    (ws, v_sector, 'Concluído', 3, true);

  return v_sector;
end;
$$;

create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  insert into public.workspace (name, owner_user_id)
    values (coalesce(nullif(trim(p_name), ''), 'Meu workspace'), auth.uid())
    returning id into v_ws;
  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_ws, auth.uid(), 'owner');

  perform public.seed_default_sector(v_ws);

  return v_ws;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;

-- Workspaces que já existem e estão presos em zero setores.
do $$
declare
  ws record;
begin
  for ws in
    select w.id from public.workspace w
    where not exists (select 1 from public.sector s where s.workspace_id = w.id)
  loop
    perform public.seed_default_sector(ws.id);
  end loop;
end;
$$;
