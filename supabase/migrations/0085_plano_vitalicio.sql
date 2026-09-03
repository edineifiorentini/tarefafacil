-- =====================================================================
-- TAFLOW — 0085_plano_vitalicio
--
-- Quem testou o produto antes de ele ter preço não paga nunca.
--
-- Promessa do dono às pessoas que usam o sistema hoje. Ele pediu em
-- 3/set/2026 que ela fosse um PLANO — não uma marca solta na empresa —,
-- atribuível só por ele dentro do painel.
--
-- **O plano já existia; o que não existia era a garantia.** Em
-- 27/ago/2026 o dono renomeou pelo painel o "Gratuito" da 0050 para
-- "Vitalício", tornou-o privado e o atribuiu a cinco empresas. Do lado
-- do código, porém, ele era só um plano de preço zero: se um dia
-- ganhasse valor, ou se alguém concedesse prazo de acesso pela tela de
-- Empresas, a promessa quebrava sem ninguém decidir isso. Esta migration
-- não cria a cortesia — ela para de depender de ninguém errar.
--
-- Por isso **nada aqui reatribui plano**. Quem recebe a cortesia já foi
-- escolhido, uma empresa de cada vez, por quem fez a promessa.
--
-- **Plano, e não coluna em `workspace`.** A 0049 já avisa que dois
-- portões decidindo acesso é como um deles esquece de fechar, e plano é
-- onde preço e limite já moram.
--
-- **O portão de acesso continua sendo `access_expires_at`.** Nada aqui
-- cria um segundo. Cinco módulos leem essa data (`app/(app)/layout`,
-- `admin/status`, `admin/metrics`, `admin/health`,
-- `admin/subscriptions`), e ensinar plano a todos eles seria criar cinco
-- chances de divergir. Em vez disso, um gatilho garante o invariante na
-- origem: plano vitalício ⇒ data nula ⇒ nunca vence, nos cinco de graça.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A bandeira.
--
-- **Por que não bastou `price_cents = 0`.** Era exatamente esse o estado
-- frágil de hoje. O plano vale zero, então `decideCharge` o dispensava
-- com o motivo "plano gratuito" — a cortesia era efeito colateral do
-- preço. Bastava alguém pôr valor no plano para começar a cobrar de
-- quem tinha a promessa. Vitalício precisa ser reconhecível pelo que É.
--
-- Coluna, e não um plano especial no código: o dono pediu a
-- possibilidade de ter outros planos assim. Qualquer plano pode ser
-- marcado, pelo próprio painel.
-- ---------------------------------------------------------------------
alter table public.billing_plan
  add column vitalicio boolean not null default false;

comment on column public.billing_plan.vitalicio is
  'Plano sem cobrança e sem fim. Nunca gera fatura e a empresa nele nunca '
  'tem data de vencimento de acesso, qualquer que seja o preço cadastrado. '
  'Nunca é público: seria acesso perpétuo de graça a quem se cadastrasse.';

-- ---------------------------------------------------------------------
-- O invariante: plano vitalício não tem data de vencimento.
--
-- Roda antes de escrever a empresa. Zera `access_expires_at` quando o
-- plano é vitalício — venha a data de onde vier: da liquidação de uma
-- cobrança (`settle.ts`), de um "conceder acesso" na tela de Empresas,
-- ou de uma correção manual no banco.
--
-- Não levanta exceção de propósito. Este gatilho existe para o acesso
-- nunca cair, e um `raise` aqui derrubaria a transação de quem só estava
-- mexendo em outra coluna da empresa. Quem chama pelo painel recebe a
-- recusa explicada na rota, antes de chegar aqui.
-- ---------------------------------------------------------------------
create or replace function public.workspace_vitalicio_sem_vencimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.access_expires_at is not null
     and new.plan_id is not null
     and exists (
       select 1
         from public.billing_plan p
        where p.id = new.plan_id
          and p.vitalicio
     )
  then
    new.access_expires_at := null;
  end if;
  return new;
end;
$fn$;

comment on function public.workspace_vitalicio_sem_vencimento() is
  'Invariante do plano vitalício: acesso sem data de vencimento. Zera '
  'access_expires_at em vez de recusar a escrita, para não derrubar quem '
  'estava mexendo em outra coluna da empresa.';

create trigger workspace_vitalicio_sem_vencimento
  before insert or update on public.workspace
  for each row
  execute function public.workspace_vitalicio_sem_vencimento();

-- ---------------------------------------------------------------------
-- O plano.
--
-- Em produção ele existe e a linha só é marcada. Num banco recriado do
-- zero ele não existe — a 0050 insere "Gratuito", "Pro" e "Equipe" —,
-- e aí precisa nascer. Os dois caminhos numa migration só, para que
-- `supabase db reset` e a produção terminem no mesmo estado.
--
-- `max_users = 5` é o que o plano tem hoje em produção, escolhido pelo
-- dono. Não é lugar de mudar o teto de assento de quem já está dentro.
-- ---------------------------------------------------------------------
insert into public.billing_plan (name, price_cents, max_users, is_public, active)
select 'Vitalício', 0, 5, false, true
 where not exists (
   select 1 from public.billing_plan where name = 'Vitalício'
 );

update public.billing_plan
   set vitalicio = true,
       -- Privado é o que o dono pediu com "selecionável apenas por mim":
       -- `/api/workspace/plan` e o `PlanChooser` filtram `is_public`, então
       -- é este booleano que fecha as duas portas de autoatendimento.
       is_public = false,
       notes = coalesce(
         notes,
         'Acesso vitalício, sem cobrança. Prometido pelo dono a quem testou '
         'o TAFLOW antes de ele ter preço. Não aparece no cadastro nem na '
         'troca de plano: só a plataforma atribui.'
       )
 where name = 'Vitalício';

-- ---------------------------------------------------------------------
-- Teste e vitalício não convivem.
--
-- Três das empresas no plano ainda estão com `trial = true`, sobra de
-- quando entraram. Duas consequências concretas: `run.ts` as pularia com
-- o motivo errado ("em teste" em vez de "plano vitalício"), e
-- `statusDaEmpresa` as rotularia "Em teste" para sempre, num painel onde
-- teste é coisa que acaba.
--
-- Só quem está no plano. Nenhuma outra empresa é tocada.
-- ---------------------------------------------------------------------
update public.workspace w
   set trial = false
  from public.billing_plan p
 where w.plan_id = p.id
   and p.vitalicio
   and w.trial;

-- ---------------------------------------------------------------------
-- Nenhum `grant` novo.
--
-- A 0050 já decide quem lê e escreve `billing_plan`, e a 0059 deixou
-- `workspace` com `grant update (name)` e mais nada — `plan_id` não está
-- lá. Uma empresa não se coloca no vitalício sozinha, que é exatamente o
-- que o dono pediu.
-- ---------------------------------------------------------------------
