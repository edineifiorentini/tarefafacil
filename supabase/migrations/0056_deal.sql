-- =====================================================================
-- TarefaFácil — 0056_deal
-- Funil de vendas (fase 4 do plano). O `Board` genérico da ADR-004 foi
-- escrito em agosto para este momento: colunas, cards e movimentação são o
-- mesmo organismo do Kanban de demandas.
--
-- Cinco decisões:
--
-- 1. O CARD É A NEGOCIAÇÃO, NÃO O CLIENTE. Com o cliente como card, a
--    prefeitura que se fecha em março e volta a negociar em setembro não
--    tem para onde ir: a etapa viraria o status dela, fechar exigiria tirar
--    o card do quadro, e o histórico de "ganhamos três, perdemos uma"
--    deixaria de existir. Um cliente tem várias negociações ao longo do
--    tempo, e é isso que esta tabela guarda.
--
-- 2. A ETAPA TEM UM `kind`. Sem ele o sistema não sabe qual coluna
--    significa ganho — e é o `kind` que decide marcar `won_at`, ativar o
--    cliente, pedir o motivo da perda e tirar o valor do total em aberto.
--    É o mesmo papel do `is_done_column` no quadro de demandas, com três
--    estados em vez de dois porque perder não é o contrário de ganhar.
--
-- 3. O WORKSPACE NASCE COM O FUNIL PRONTO. É a lição das migrations 0043 e
--    0051: entidade obrigatória sem semente vira beco sem saída na porta de
--    entrada. Funil vazio não tem nem para onde arrastar.
--
-- 4. VALOR EM CENTAVOS INTEIROS, como todo dinheiro no projeto. E anulável:
--    negociação recém-aberta muitas vezes ainda não tem preço, e zero
--    mentiria no total.
--
-- 5. POSIÇÃO FRACIONÁRIA (`numeric`), igual à do `task.position`. Arrastar
--    um card calcula o ponto médio entre os vizinhos em vez de reescrever a
--    coluna inteira.
-- =====================================================================

create table public.pipeline_stage (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  position     integer not null default 0,

  /** O que a coluna significa para o negócio, não como ela se chama.
      Renomear "Fechado" para "Assinado" não pode mudar o comportamento. */
  kind         text not null default 'aberta'
                 check (kind in ('aberta', 'ganho', 'perdido')),

  created_at   timestamptz not null default now()
);

create index pipeline_stage_workspace_idx
  on public.pipeline_stage (workspace_id, position);

create table public.deal (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,

  -- Toda negociação é com alguém. Criar um lead no funil cadastra o cliente
  -- como prospecto na mesma ação — dois cadastros de contato paralelos é o
  -- jeito conhecido de um CRM apodrecer.
  client_id    uuid not null references public.client(id) on delete cascade,

  -- `restrict`: apagar etapa com negociação dentro deixaria o card sem
  -- coluna, invisível no quadro e vivo no banco. Esvazie antes.
  stage_id     uuid not null references public.pipeline_stage(id) on delete restrict,

  title        text not null check (char_length(title) between 1 and 160),
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  position     numeric not null default 0,

  responsible_id     uuid references public.app_user(id) on delete set null,
  expected_close_on  date,

  -- Quando, e não só "se": a data é o que permite medir tempo de ciclo
  -- depois, sem inventar o passado.
  won_at       timestamptz,
  lost_at      timestamptz,
  /** Por que perdemos. Anulável de propósito — perguntado, nunca exigido. */
  lost_reason  text,

  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Ganha e perdida ao mesmo tempo é estado impossível.
  constraint deal_outcome_check check (won_at is null or lost_at is null)
);

create index deal_stage_idx on public.deal (workspace_id, stage_id, position);
create index deal_client_idx on public.deal (client_id);

create trigger deal_touch
  before update on public.deal
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: mesma porta do resto do workspace.
-- ---------------------------------------------------------------------
alter table public.pipeline_stage enable row level security;
alter table public.deal           enable row level security;

create policy pipeline_stage_select on public.pipeline_stage
  for select using (public.is_member(workspace_id));
create policy pipeline_stage_write on public.pipeline_stage
  for all
  using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));

create policy deal_select on public.deal
  for select using (public.is_member(workspace_id));
create policy deal_write on public.deal
  for all
  using (public.has_role(workspace_id, array['owner', 'admin', 'member']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'member']));

-- ---------------------------------------------------------------------
-- Semente do funil.
-- ---------------------------------------------------------------------
create or replace function public.seed_default_pipeline(ws uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline_stage (workspace_id, name, position, kind)
  values
    (ws, 'Novo lead',        0, 'aberta'),
    (ws, 'Em contato',       1, 'aberta'),
    (ws, 'Proposta enviada', 2, 'aberta'),
    (ws, 'Em negociação',    3, 'aberta'),
    (ws, 'Fechado',          4, 'ganho'),
    (ws, 'Perdido',          5, 'perdido');
end;
$$;

-- Workspace novo pelo cadastro (trigger) e pelo app (RPC) recebem o funil.
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

  perform public.seed_default_sector(v_ws);
  perform public.seed_default_pipeline(v_ws);

  return new;
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
  perform public.seed_default_pipeline(v_ws);

  return v_ws;
end;
$$;

-- Quem já existe também ganha o funil.
do $$
declare
  ws record;
begin
  for ws in
    select w.id from public.workspace w
    where not exists (
      select 1 from public.pipeline_stage s where s.workspace_id = w.id
    )
  loop
    perform public.seed_default_pipeline(ws.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Auditoria: quem apagou negociação entra na mesma trilha do resto.
-- ---------------------------------------------------------------------
create or replace function public.audit_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rotulo text;
  nome text;
  quem text := coalesce(public.actor_name(), 'Alguém');
begin
  rotulo := case tg_table_name
    when 'task'    then 'a demanda'
    when 'client'  then 'o cliente'
    when 'sector'  then 'o setor'
    when 'project' then 'o projeto'
    when 'deal'    then 'a negociação'
    else tg_table_name
  end;

  nome := coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name', '?');

  perform public.write_audit(
    old.workspace_id, 'excluiu', tg_table_name, old.id,
    quem || ' excluiu ' || rotulo || ' "' || nome || '"',
    null);

  return old;
end;
$fn$;

create trigger deal_audit_delete
  after delete on public.deal
  for each row execute function public.audit_deletion();
