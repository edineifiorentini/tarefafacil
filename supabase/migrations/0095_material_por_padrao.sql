-- =====================================================================
-- TAFLOW — 0095_material_por_padrao
-- Conserta o upload, que a 0093 quebrou.
--
-- A 0093 tornou `material_id` obrigatório e não deu default. O insert do
-- anexo não o preenche — nem o do upload, nem o do link do Drive —, então
-- TODO envio de arquivo passou a falhar com violação de not-null.
--
-- Não apareceu em typecheck, lint, nos 1015 testes nem no build: nenhum
-- deles insere anexo de verdade. Apareceu ao abrir o arquivo do upload para
-- escrever a interface do ciclo, minutos depois de aplicar a migration.
--
-- **O conserto é gatilho, e não default.** A primeira versão de um material
-- aponta para SI MESMA, e `default` não enxerga a linha que está nascendo —
-- não existe `default id`. O gatilho enxerga, e resolve para todo mundo que
-- escreve na tabela: o upload, o link, o painel da plataforma e o que vier
-- depois. Preencher no aplicativo consertaria os dois lugares de hoje e
-- deixaria a armadilha armada para o terceiro.
-- =====================================================================

create or replace function public.attachment_material_padrao()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  -- Só quando ninguém disse. Quem está subindo uma versão nova informa o
  -- material da peça anterior, e isso tem que passar intacto.
  if new.material_id is null then
    new.material_id := new.id;
  end if;
  return new;
end;
$fn$;

comment on function public.attachment_material_padrao() is
  'A primeira versão de um material aponta para si mesma (0093). Gatilho porque `default` não alcança a coluna id da linha que nasce.';

create trigger attachment_material_padrao
  before insert on public.attachment
  for each row execute function public.attachment_material_padrao();
