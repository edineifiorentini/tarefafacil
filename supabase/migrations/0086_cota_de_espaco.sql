-- =====================================================================
-- TAFLOW — 0086_cota_de_espaco
-- Espaço por empresa, e prazo do arquivo no servidor.
--
-- Decidido pelo dono em 4/set/2026, mudando a estratégia anterior. Antes o
-- controle era um teto por ARQUIVO (25 MB), e ele resolvia o problema
-- errado: barrava o vídeo de campanha de 30 MB, que é legítimo, e não dizia
-- nada sobre a empresa que sobe mil imagens de 2 MB. O servidor tem 10 GB e
-- quem o esgota é o total.
--
-- Agora: 1 GB por empresa enquanto o projeto está nesta fase, e a saída para
-- quem precisa de mais não é pedir aumento — é apontar o arquivo para o
-- Google Drive. Link do Drive já custa zero byte aqui (`kind = 'link'`, sem
-- `storage_key`), então a régua separa sozinha o que ocupa do que não ocupa.
--
-- E o arquivo tem prazo, porque o TAFLOW é gestão de demanda e não um drive:
-- aprovado some do servidor em 30 dias (já foi para a gráfica ou para as
-- redes), e material que ninguém respondeu some em 45.
-- =====================================================================

-- ---------------------------------------------------------------- cota
-- Por empresa e não constante no código: o plano vitalício, o plano pago e
-- a empresa que negociar espaço extra precisam de valores diferentes, e
-- trocar um número em `workspace` é o caminho que não exige deploy.
alter table public.workspace
  add column if not exists storage_limit_bytes bigint not null
    default 1073741824;  -- 1 GB

comment on column public.workspace.storage_limit_bytes is
  'Teto de espaço no servidor, em bytes (0086). Só conta anexo com storage_key; link do Drive não ocupa.';

alter table public.workspace
  drop constraint if exists workspace_storage_limit_positivo;
alter table public.workspace
  add constraint workspace_storage_limit_positivo
    check (storage_limit_bytes > 0);

-- ------------------------------------------------------------- retirada
-- A LINHA SOBREVIVE À RETIRADA, e isso é o ponto.
--
-- Apagar a linha junto com o objeto pareceria mais limpo e destruiria duas
-- coisas: o histórico (ninguém saberia que a peça existiu) e a explicação
-- na tela do cliente, que passaria a mostrar um arquivo quebrado em vez de
-- uma frase dizendo o que aconteceu.
alter table public.attachment
  add column if not exists purged_at timestamptz,
  add column if not exists purge_reason text;

alter table public.attachment
  drop constraint if exists attachment_purge_reason_check;
alter table public.attachment
  add constraint attachment_purge_reason_check check (
    (purged_at is null and purge_reason is null) or
    (purged_at is not null and purge_reason in ('aprovado_30d', 'sem_decisao_45d'))
  );

comment on column public.attachment.purged_at is
  'Quando o arquivo saiu do servidor (0086). A linha fica: o histórico e a explicação ao cliente dependem dela.';

-- A varredura procura entregável ainda no servidor. Índice parcial porque
-- essa é a minoria das linhas, e a leitura roda uma vez por semana.
create index if not exists attachment_no_servidor_idx
  on public.attachment (workspace_id, created_at)
  where entregavel and storage_key is not null and purged_at is null;

-- ------------------------------------------------------------------ uso
-- Soma o que ocupa o servidor AGORA: só `kind = 'file'`, só o que tem
-- chave, e nada que já tenha sido retirado.
--
-- `security definer` porque a varredura do cron e a checagem de upload
-- precisam do total da empresa inteira, e a RLS de `attachment` recorta por
-- membro. `search_path` fixo é a trava que impede sequestro por schema.
create or replace function public.workspace_storage_used(p_workspace uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from public.attachment
  where workspace_id = p_workspace
    and kind = 'file'
    and storage_key is not null
    and purged_at is null;
$$;

comment on function public.workspace_storage_used(uuid) is
  'Bytes ocupados no servidor pela empresa (0086). Link do Drive não entra.';

revoke all on function public.workspace_storage_used(uuid) from public;
grant execute on function public.workspace_storage_used(uuid) to authenticated;

-- Índice que sustenta a soma acima.
create index if not exists attachment_uso_idx
  on public.attachment (workspace_id)
  where kind = 'file' and storage_key is not null and purged_at is null;
