alter table pagos
  add column if not exists metodo_pago text not null default 'efectivo'
  check (metodo_pago in ('efectivo', 'transferencia'));
