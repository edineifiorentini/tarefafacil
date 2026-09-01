-- =====================================================================
-- TAFLOW — 0082_sector_responsavel
-- Gestor de setor: quem responde pela equipe.
--
-- Pedido do dono em 31/ago/2026: "minha equipe sempre me reporta sobre as
-- tarefas e dúvidas, mas geralmente não me reporta uma tarefa que está para
-- cumprir ou que está em atraso". As três visões que ele descreveu — dono,
-- gestor, funcionário — precisam de um dado que não existia: quem é o
-- gestor de cada setor.
--
-- **Ser gestor é INDEPENDENTE do papel, e isso é decisão de produto.**
-- O caminho óbvio seria promover o líder de equipe a `admin`. Não serve:
-- neste sistema `admin` abre o módulo financeiro inteiro — `finance_entry`,
-- `finance_category` e `finance_rate` são todas owner/admin. Um líder de
-- equipe precisa enxergar o prazo do time, não o caixa da empresa nem o
-- valor/hora de cada colega. Por isso um `member` comum pode ser gestor.
--
-- O eixo é o SETOR e não a cadeia de chefia, porque `task.assignee_id` é
-- anulável: na cadeia de pessoas, uma tarefa atrasada sem responsável
-- escala para ninguém — justamente a que mais apodrece. Pela regra 11 toda
-- tarefa tem setor, então o gestor de setor cobre 100% delas.
-- =====================================================================

alter table public.sector
  add column responsavel_id uuid references public.app_user(id) on delete set null;

comment on column public.sector.responsavel_id is
  'Gestor do setor. Independente do papel — member comum pode ser gestor.';

-- ---------------------------------------------------------------------
-- Quem escreve o quê
--
-- A policy da 0011 deixa `owner`, `admin` E `member` escreverem em `sector`.
-- Sem o corte abaixo, qualquer funcionário se nomearia gestor do próprio
-- setor — `useUpdateSector` manda um patch livre, e o que o banco não
-- proíbe, ele aceita.
--
-- RLS não sabe restringir COLUNA. Então: grant por coluna para o que a tela
-- edita, e uma função com dono para o que precisa de papel. Mesmo desenho
-- da 0059, que tirou `seat_limit` das mãos do cliente.
-- ---------------------------------------------------------------------

revoke update on table public.sector from authenticated;
revoke update on table public.sector from anon;

grant update (name, color, icon, position, archived_at)
  on table public.sector to authenticated;

/**
 * Define (ou tira) o gestor de um setor.
 *
 * `security definer` porque ela precisa escrever numa coluna que ninguém
 * tem grant para escrever. Quem autoriza é o `has_role` aqui dentro.
 *
 * Confere também que a pessoa é membro ATIVO da mesma empresa: sem isso,
 * um id de outra empresa viraria gestor de um setor daqui, e o relatório
 * passaria a mostrar as tarefas do time para alguém de fora.
 */
create or replace function public.definir_gestor_de_setor(
  setor uuid,
  pessoa uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ws uuid;
begin
  select workspace_id into ws from public.sector where id = setor;
  if ws is null then
    raise exception 'setor não encontrado';
  end if;

  if not public.has_role(ws, array['owner', 'admin']) then
    raise exception 'só quem administra a empresa define gestor';
  end if;

  -- Nulo é intencional: é como se tira o gestor.
  if pessoa is not null and not exists (
    select 1 from public.workspace_member m
     where m.workspace_id = ws
       and m.user_id = pessoa
       and m.status = 'active'
  ) then
    raise exception 'pessoa não é membro ativo desta empresa';
  end if;

  update public.sector set responsavel_id = pessoa where id = setor;
end;
$$;

revoke execute on function public.definir_gestor_de_setor(uuid, uuid) from public;
grant execute on function public.definir_gestor_de_setor(uuid, uuid) to authenticated;

create index sector_responsavel_idx on public.sector (responsavel_id)
  where responsavel_id is not null;
