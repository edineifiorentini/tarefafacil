-- =====================================================================
-- TarefaFácil — 0005_sector_color_hex  (E06)
-- Decisão do dono: cor do setor passa a ser hexadecimal livre, não mais o
-- enum de 5 chaves. Remove o CHECK; a coluna segue text (agora guarda #RRGGBB).
-- Valores antigos (ex.: 'coral') permanecem válidos como texto.
-- =====================================================================

alter table public.sector drop constraint if exists sector_color_check;
