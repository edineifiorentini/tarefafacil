-- =====================================================================
-- TarefaFácil — 0061_signups_gate
-- Fechar a porta para cadastro novo, sem trancar quem foi convidado.
--
-- **O cuidado que dá forma a esta migration:** quem você convida para um
-- workspace TAMBÉM precisa criar uma conta. Um bloqueio ingênuo no trigger
-- de cadastro fecharia a porta na cara do seu próprio time, e o sintoma
-- apareceria dias depois, do lado de quem não consegue explicar o erro.
--
-- Por isso a regra é: cadastro fechado recusa quem chega do nada, e deixa
-- passar quem tem convite pendente para aquele e-mail.
--
-- **Consequência que precisa estar clara no painel:** com os cadastros
-- fechados, convite SEM e-mail (aquele link aberto que serve para qualquer
-- pessoa) para de funcionar para quem ainda não tem conta — não há como o
-- banco saber, na hora de criar o usuário, que ele carrega um token. Convide
-- pelo e-mail enquanto a porta estiver fechada.
--
-- A tabela tem uma linha só, garantida pelo `check (id)`: chave primária
-- booleana que só aceita `true`. Sem isso, "a configuração da plataforma"
-- vira várias e alguém lê a errada.
-- =====================================================================

create table public.platform_setting (
  id              boolean primary key default true check (id),
  signups_enabled boolean not null default true,
  updated_at      timestamptz not null default now()
);

insert into public.platform_setting (id) values (true);

create trigger platform_setting_touch
  before update on public.platform_setting
  for each row execute function public.set_updated_at();

-- Ninguém lê nem escreve pelo cliente: RLS ligada e nenhuma policy. Quem
-- administra passa pelas rotas `/api/admin`, que conferem o e-mail contra
-- PLATFORM_ADMIN_EMAILS; o trigger abaixo é security definer e enxerga.
alter table public.platform_setting enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
  v_aberto boolean;
  v_convidado boolean;
begin
  select signups_enabled into v_aberto from public.platform_setting limit 1;

  if not coalesce(v_aberto, true) then
    select exists (
      select 1 from public.workspace_invite i
      where i.status = 'pending'
        and i.expires_at > now()
        and lower(i.email) = lower(new.email)
    ) into v_convidado;

    if not v_convidado then
      -- A mensagem sai para quem tentou se cadastrar. Diz o que aconteceu
      -- sem prometer o que não vai acontecer.
      raise exception 'Cadastros temporariamente fechados. Fale com quem administra o sistema.'
        using errcode = 'check_violation';
    end if;
  end if;

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
