-- =====================================================================
-- TAFLOW — 0089_carencia
-- A tolerância depois do vencimento vira política, e não constante.
--
-- Era `GRACE_DAYS = 5` em `lib/billing/cycle.ts`. O comentário de lá diz
-- por que ela existe, e continua valendo: "Pix cai em minutos mas boleto e
-- conciliação erram por horas, e cortar o acesso de quem pagou no dia é o
-- pior defeito possível num SaaS — quem foi cortado injustamente não volta."
--
-- Justamente por isso o número precisa ser ajustável sem deploy: no dia em
-- que a conciliação atrasar, quem administra aumenta a folga em segundos.
--
-- **Zero é permitido, e é uma escolha perigosa que fica registrada:** com
-- zero, o acesso cai no mesmo dia do vencimento, sem nenhuma folga para
-- pagamento em processamento. O teto de 60 existe para o outro lado —
-- carência maior que dois meses deixa de ser tolerância e vira gratuidade
-- sem ninguém ter decidido isso.
-- =====================================================================

alter table public.platform_setting
  add column if not exists grace_days integer not null default 5;

alter table public.platform_setting
  drop constraint if exists platform_setting_grace_days_check;
alter table public.platform_setting
  add constraint platform_setting_grace_days_check
    check (grace_days between 0 and 60);

comment on column public.platform_setting.grace_days is
  'Dias de tolerância depois do vencimento antes de cortar o acesso (0089). Entra em access_expires_at.';
