-- Agrega 'proporcional' como tipo de pago válido (upgrade 1x → 2x mid-month)
alter table public.pagos
  drop constraint if exists pagos_tipo_check;

alter table public.pagos
  add constraint pagos_tipo_check check (tipo in ('normal', 'prueba', 'proporcional'));
