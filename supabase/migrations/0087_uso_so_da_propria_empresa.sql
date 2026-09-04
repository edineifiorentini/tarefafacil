-- =====================================================================
-- TAFLOW — 0087_uso_so_da_propria_empresa
-- Conserta um vazamento entre empresas que a 0086 abriu.
--
-- `workspace_storage_used` nasceu `security definer` — precisa ser, porque
-- soma a empresa inteira e a RLS de `attachment` recorta por membro — mas
-- **sem conferir quem está chamando**, e com `grant execute` para
-- `authenticated`. Ou seja: qualquer usuário logado passava o id de outra
-- empresa e recebia quanto ela ocupa no servidor.
--
-- É pouco dado, e é dado de outra empresa mesmo assim. Num SaaS multi-tenant
-- a régua não é "quanto vaza", é "vaza". Regra 3 do CLAUDE.md.
--
-- `security definer` sem checagem de quem chama é a armadilha clássica da
-- construção: a função contorna a RLS de propósito, então a autorização que
-- a RLS daria de graça passa a ser responsabilidade do corpo dela.
-- =====================================================================

create or replace function public.workspace_storage_used(p_workspace uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- `is_member` (0003) responde por `auth.uid()`, então a checagem vale
    -- para quem chama pela chave publishable. A chave secreta não tem
    -- `auth.uid()` e cai no zero — por isso o cron e as rotas de servidor
    -- somam direto na tabela, sem passar por aqui.
    when public.is_member(p_workspace) then (
      select coalesce(sum(size_bytes), 0)::bigint
      from public.attachment
      where workspace_id = p_workspace
        and kind = 'file'
        and storage_key is not null
        and purged_at is null
    )
    else 0
  end;
$$;

comment on function public.workspace_storage_used(uuid) is
  'Bytes ocupados no servidor pela empresa (0086). Só responde a membro dela (0087). Link do Drive não entra.';

revoke all on function public.workspace_storage_used(uuid) from public;
grant execute on function public.workspace_storage_used(uuid) to authenticated;

-- ------------------------------------------------- a cota vira regra
-- A checagem da 0086 mora no NAVEGADOR, antes do envio começar. Isso é bom
-- para o erro chegar cedo e claro, e **não é limite nenhum**: o upload vai
-- do cliente direto para o storage com a chave publishable, então quem
-- chamasse a API na mão passava por cima.
--
-- Aqui é onde vira regra. A linha em `attachment` é o que faz o arquivo
-- existir para o produto — sem ela o objeto é órfão, e a varredura de
-- domingo o recolhe. Barrar o INSERT barra o arquivo.
--
-- Soma direto da tabela em vez de chamar `workspace_storage_used`: aquela
-- responde por `auth.uid()` e devolveria zero para a chave secreta,
-- desligando a trava justamente no caminho do servidor.
create or replace function public.attachment_respeita_cota()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  usado  bigint;
  teto   bigint;
begin
  -- Link do Drive não ocupa byte: é a saída oferecida a quem bate na cota,
  -- e barrá-lo aqui fecharia a porta que a mensagem manda usar.
  if new.kind <> 'file' or new.storage_key is null then
    return new;
  end if;

  select storage_limit_bytes into teto
  from public.workspace where id = new.workspace_id;

  if teto is null then
    return new;
  end if;

  select coalesce(sum(size_bytes), 0) into usado
  from public.attachment
  where workspace_id = new.workspace_id
    and kind = 'file'
    and storage_key is not null
    and purged_at is null;

  if usado + coalesce(new.size_bytes, 0) > teto then
    raise exception
      'Sem espaço no servidor para esta empresa. Suba o arquivo no Google Drive e cole o link.'
      using errcode = 'disk_full';
  end if;

  return new;
end;
$fn$;

drop trigger if exists attachment_cota on public.attachment;
create trigger attachment_cota
  before insert on public.attachment
  for each row execute function public.attachment_respeita_cota();
