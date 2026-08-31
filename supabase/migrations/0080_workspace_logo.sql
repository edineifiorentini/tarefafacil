-- =====================================================================
-- TarefaFácil — 0080_workspace_logo
-- Logo da empresa, no lugar do nome escrito.
--
-- Pedido do dono (ago/2026): "onde estiver escrito o nome ser a logo da
-- empresa da pessoa". A cor da marca saiu na 0071; a logo é a outra metade.
--
-- A ausência de logo cai na marca do TarefaFácil, não no nome: a casca
-- nasce com a nossa identidade e o cliente a substitui pela dele. É
-- white-label por cima do padrão, decidido pelo dono em 31/ago/2026.
--
-- **Menos o contrato impresso.** Lá o cabeçalho identifica a parte
-- contratada, e cair na nossa marca colocaria o fornecedor de software num
-- documento jurídico que não é nosso. Sem logo da empresa, o contrato
-- escreve o nome — como sempre fez.
-- =====================================================================

alter table public.workspace add column logo_url text;

-- A 0059 revogou o UPDATE do cliente na tabela e devolveu coluna por
-- coluna; a 0071 acrescentou `brand_theme`. A logo entra na mesma lista
-- curta, pelo mesmo motivo: é identidade visual, não mexe em assento nem em
-- vencimento. A policy da 0011 (`has_role(id, owner/admin)`) continua sendo
-- quem decide QUAIS linhas.
grant update (logo_url) on public.workspace to authenticated;

comment on column public.workspace.logo_url is
  'Logo da empresa. Nulo cai na marca do produto, menos no contrato impresso.';

-- ---------------------------------------------------------------------
-- Bucket
--
-- Público, pela mesma razão do `avatars` (0069): a logo aparece na casca de
-- toda tela, e assinar URL para uma imagem de cabeçalho seria muita máquina
-- para pouca coisa. O que protege é o caminho ser imprevisível — pasta da
-- empresa mais nome aleatório.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Policies
--
-- Caminho: {workspace_id}/{aleatório}.webp
--
-- Aqui está a diferença para o avatar: lá a pasta é o próprio usuário, e
-- `auth.uid()::text` resolvia sozinho. A pasta da logo é a EMPRESA, então
-- quem pode escrever é quem administra a empresa — senão qualquer membro
-- trocaria a marca da companhia inteira.
--
-- O `case` não é enfeite. A pasta precisa virar uuid para o `has_role`, e
-- `logos/naoehuuid/x.webp` levantaria erro de conversão em vez de negar
-- educadamente. `and` não garante ordem de avaliação no Postgres; `case`
-- garante. Por isso o formato é conferido ANTES do cast.
-- ---------------------------------------------------------------------

create or replace function public.pode_gerir_logo(caminho text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when (storage.foldername(caminho))[1] ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.has_role(
      ((storage.foldername(caminho))[1])::uuid,
      array['owner', 'admin']
    )
    else false
  end;
$$;

grant execute on function public.pode_gerir_logo(text) to authenticated;

create policy "logos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.pode_gerir_logo(name));

create policy "logos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.pode_gerir_logo(name));

create policy "logos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.pode_gerir_logo(name));

-- SELECT desde já — é a lição da 0070, que corrigiu a 0069.
--
-- O bucket é público e a leitura pela URL não passa por policy, então é
-- fácil achar que SELECT não faz falta. Faz: `remove()` e `list()` precisam
-- enxergar a linha em `storage.objects` antes de agir. Sem isso o
-- `remove()` apaga zero linhas e **não devolve erro** — trocar a logo
-- deixaria a anterior no bucket, acessível a quem guardou a URL.
create policy "logos_select"
  on storage.objects for select
  using (bucket_id = 'logos');
