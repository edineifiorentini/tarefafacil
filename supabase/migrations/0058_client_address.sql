-- =====================================================================
-- TarefaFácil — 0058_client_address
-- Endereço do cliente em campos separados, para o CEP poder preencher.
--
-- Hoje `client.address` é uma linha de texto livre. Uma linha só não dá
-- para preencher a partir do CEP (o serviço devolve logradouro, bairro,
-- cidade e UF em campos distintos), não dá para ordenar por cidade e não dá
-- para montar o endereço de um contrato em formato padrão.
--
-- `address` NÃO É APAGADA. O que já foi digitado nela continua lá e
-- continua aparecendo enquanto os campos novos estiverem vazios. Migrar
-- texto livre para campos estruturados por adivinhação — separar "Rua X,
-- 123 - Centro" no vírgula e no hífen — erra em endereço com complemento,
-- em "s/n" e em qualquer coisa fora do padrão, e o erro fica gravado. Quem
-- reeditar o cliente preenche os campos novos e a linha antiga sai de cena
-- sozinha.
-- =====================================================================

alter table public.client
  add column zip_code   text check (zip_code is null or zip_code ~ '^[0-9]{8}$'),
  add column street     text,
  add column number     text,
  add column complement text,
  add column district   text,
  add column city       text,
  -- Duas letras, maiúsculas: é o que o CEP devolve e o que a nota exige.
  add column state      text check (state is null or state ~ '^[A-Z]{2}$');

-- Cidade é o recorte que se usa para filtrar carteira ("meus clientes de
-- Cascavel"); o resto do endereço nunca é critério de busca.
create index client_city_idx on public.client (workspace_id, city)
  where city is not null;
