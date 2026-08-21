-- =====================================================================
-- TarefaFácil — 0062_notification_preference
-- Cada pessoa escolhe o que quer ver no sino.
--
-- A preferência é POR PESSOA, não por workspace: quem participa de duas
-- empresas não quer decidir duas vezes que não liga para aviso de contrato.
--
-- **A preferência filtra a EXIBIÇÃO, não a gravação.** O evento continua
-- sendo gravado pelo trigger — quem foi mencionado foi mencionado, e isso é
-- fato. Desligar aqui é dizer "não me mostre", não "finja que não houve":
-- religar traz o histórico de volta em vez de revelar um buraco. Alerta de
-- prazo nem gravado é: ele é calculado na leitura, então desligar é
-- simplesmente não calcular.
--
-- Tudo nasce ligado. Sino que chega mudo faz a pessoa concluir que o
-- sistema não avisa nada.
-- =====================================================================

create table public.notification_preference (
  user_id uuid primary key references public.app_user(id) on delete cascade,

  -- Eventos gravados por trigger.
  mencao      boolean not null default true,
  atribuicao  boolean not null default true,
  comentario  boolean not null default true,

  -- Alertas calculados na leitura.
  prazos      boolean not null default true,
  contratos   boolean not null default true,
  financeiro  boolean not null default true,

  updated_at  timestamptz not null default now()
);

create trigger notification_preference_touch
  before update on public.notification_preference
  for each row execute function public.set_updated_at();

alter table public.notification_preference enable row level security;

-- Só a própria linha, nos três verbos. Ninguém escolhe o que a outra
-- pessoa recebe.
create policy notification_preference_select on public.notification_preference
  for select using (user_id = auth.uid());
create policy notification_preference_insert on public.notification_preference
  for insert with check (user_id = auth.uid());
create policy notification_preference_update on public.notification_preference
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
