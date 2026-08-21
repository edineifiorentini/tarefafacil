-- =====================================================================
-- TarefaFácil — 0060_trial
-- Sete dias de teste para quem se cadastra.
--
-- **`trial_ends_at` NÃO BLOQUEIA NADA, e isso é decisão, não pendência.**
-- Quem barra acesso é `access_expires_at`, que a 0017 consulta dentro de
-- `has_role`. Enquanto a cobrança do EFI não existe, cortar no oitavo dia
-- seria trancar a pessoa para fora por causa de uma fatura que o sistema
-- ainda não sabe emitir — e quem é cortado injustamente não volta. O dono
-- decidiu adiar essa escolha para quando o gateway entrar; até lá a data
-- serve para (1) mostrar a contagem para quem está testando e (2) aparecer
-- na aba Empresas do painel da plataforma.
--
-- Quando o EFI entrar, ligar o corte é copiar `trial_ends_at` para
-- `access_expires_at` — um lugar só, que já é o portão de todo mundo. Dois
-- portões decidindo acesso é como um deles esquece de fechar.
-- =====================================================================

alter table public.workspace
  add column trial_ends_at timestamptz;

-- Cadastro novo nasce em teste. Workspace criado por quem já é cliente
-- (RPC `create_workspace`) não ganha teste: quem já paga não está testando.
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

  insert into public.workspace (name, owner_user_id, trial, trial_ends_at)
    values ('Meu workspace', new.id, true, now() + interval '7 days')
    returning id into v_ws;

  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_ws, new.id, 'owner');

  perform public.seed_default_sector(v_ws);
  perform public.seed_default_pipeline(v_ws);

  return new;
end;
$$;
