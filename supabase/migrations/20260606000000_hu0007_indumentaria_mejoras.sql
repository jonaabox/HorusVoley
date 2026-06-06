-- HU0007: Mejoras en indumentaria
-- 1. Ampliar talles disponibles (PP, M, XG)
-- 2. Agregar columna nombre_camiseta

alter table public.pedidos_indumentaria
  drop constraint if exists pedidos_indumentaria_talle_check;

alter table public.pedidos_indumentaria
  add constraint pedidos_indumentaria_talle_check
  check (talle in ('PP', 'P', 'M', 'G', 'GG', 'XG'));

alter table public.pedidos_indumentaria
  add column if not exists nombre_camiseta text;
