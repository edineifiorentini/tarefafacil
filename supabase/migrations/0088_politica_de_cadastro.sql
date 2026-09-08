-- =====================================================================
-- TAFLOW — 0088_politica_de_cadastro
-- Os números do cadastro saem do código e viram política editável.
--
-- Até aqui `platform_setting` tinha uma coluna só (`signups_enabled`, da
-- 0061), e a tela de Configurações da plataforma dizia isso com todas as
-- letras: campo sem a regra que o respeita vira interruptor que não faz
-- nada. As três colunas abaixo entram JUNTO com a regra.
--
-- Duração do teste e assentos iniciais eram literais dentro de
-- `handle_new_user` — `interval '7 days'` e o `default 5` da 0013. Mudá-los
-- exigia migration; agora é um campo no painel.
--
-- **O que a duração do teste NÃO faz, e continua não fazendo:** cortar
-- acesso. A 0060 decidiu que `trial_ends_at` não é portão — quem barra é
-- `access_expires_at`, dentro de `has_role`. Enquanto a cobrança não
-- emitir fatura, cortar no oitavo dia trancaria a pessoa para fora por uma
-- conta que o sistema não sabe cobrar. Este campo muda a contagem que
-- aparece para quem testa e na aba Empresas; o corte segue onde estava.
--
-- Assentos iniciais, ao contrário, TÊM dente: o convite respeita
-- `seat_limit` desde a 0013.
-- =====================================================================

alter table public.platform_setting
  add column if not exists trial_days integer not null default 7,
  add column if not exists initial_seats integer not null default 5,
  add column if not exists audit_keep_days integer not null default 365;

-- Os limites são de sanidade, não de produto: impedem o campo de receber
-- um número que quebraria o cadastro ou apagaria a auditoria inteira.
alter table public.platform_setting
  drop constraint if exists platform_setting_trial_days_check;
alter table public.platform_setting
  add constraint platform_setting_trial_days_check
    check (trial_days between 0 and 90);

alter table public.platform_setting
  drop constraint if exists platform_setting_initial_seats_check;
alter table public.platform_setting
  add constraint platform_setting_initial_seats_check
    check (initial_seats between 1 and 500);

-- Mínimo de 30 dias: auditoria é a resposta para "quem mudou isso?", e uma
-- janela menor que um mês não responde nada de útil.
alter table public.platform_setting
  drop constraint if exists platform_setting_audit_keep_days_check;
alter table public.platform_setting
  add constraint platform_setting_audit_keep_days_check
    check (audit_keep_days between 30 and 3650);

comment on column public.platform_setting.trial_days is
  'Dias de teste de quem se cadastra (0088). NÃO corta acesso — ver 0060.';
comment on column public.platform_setting.initial_seats is
  'Assentos de um workspace novo (0088). O convite respeita, desde a 0013.';
comment on column public.platform_setting.audit_keep_days is
  'Por quanto tempo audit_log é guardada (0088). A varredura semanal aplica.';

-- ------------------------------------------------- a regra que respeita
-- Mesma trigger da 0061, com os dois literais trocados por leitura da
-- política. O resto — a trava de cadastro fechado e a exceção de quem tem
-- convite — fica exatamente como estava.
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
  v_dias integer;
  v_assentos integer;
begin
  select signups_enabled, trial_days, initial_seats
    into v_aberto, v_dias, v_assentos
    from public.platform_setting limit 1;

  -- `coalesce` em cada um: a tabela tem uma linha só e ela existe desde a
  -- 0061, mas um `select` que não achasse nada não pode criar workspace com
  -- zero assentos.
  v_dias := coalesce(v_dias, 7);
  v_assentos := coalesce(v_assentos, 5);

  if not coalesce(v_aberto, true) then
    -- Cadastro fechado NÃO fecha para quem foi convidado. É o que faz
    -- "somente por convite" existir sem precisar de um segundo interruptor.
    select exists (
      select 1 from public.workspace_invite i
      where i.status = 'pending'
        and i.expires_at > now()
        and lower(i.email) = lower(new.email)
    ) into v_convidado;

    if not v_convidado then
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

  insert into public.workspace
    (name, owner_user_id, trial, trial_ends_at, seat_limit)
    values (
      'Meu workspace',
      new.id,
      -- Zero dias significa "sem período de teste". Aí a empresa não nasce
      -- em teste E não ganha data — marcar `trial` com a data nula, ou uma
      -- data já vencida, deixaria a aba Empresas mostrando um teste que
      -- nunca existiu.
      v_dias > 0,
      case when v_dias > 0 then now() + make_interval(days => v_dias) end,
      v_assentos
    )
    returning id into v_ws;

  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_ws, new.id, 'owner');

  perform public.seed_default_sector(v_ws);
  perform public.seed_default_pipeline(v_ws);

  return new;
end;
$$;
