-- =====================================================================
-- TarefaFácil — 0051_signup_default_sector
-- A 0043 criou o setor "Geral" para workspace novo, mas só no caminho
-- `create_workspace` (usuário já logado criando outro workspace) e no
-- backfill de quem já existia. O caminho que TODO cliente novo percorre é
-- outro: o trigger `handle_new_user`, que insere o workspace direto e nunca
-- chamou `seed_default_sector`.
--
-- Resultado: cada cadastro novo caía exatamente no beco sem saída que a
-- 0043 existia para eliminar — `task.sector_id` é not null, então a
-- primeira tela útil pedia um setor que ninguém tinha.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  insert into public.app_user (id, email, display_name)
    values (
      new.id,
      new.email,
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      )
    )
    on conflict (id) do nothing;

  insert into public.workspace (name, owner_user_id)
    values ('Meu workspace', new.id)
    returning id into v_ws;

  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_ws, new.id, 'owner');

  -- A parte que faltava.
  perform public.seed_default_sector(v_ws);

  return new;
end;
$$;

-- Rede de segurança: se algum workspace escapou entre a 0043 e esta, ele
-- ganha o setor agora.
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
