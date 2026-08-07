-- =====================================================================
-- TarefaFácil — 0004_auth_trigger  (E03)
-- No signup (insert em auth.users), cria automaticamente app_user +
-- workspace + workspace_member (owner). SECURITY DEFINER para inserir nas
-- tabelas public ignorando RLS. Ver ADR-001.
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
