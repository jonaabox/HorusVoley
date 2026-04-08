-- Tipo de pago: 'normal' (cuota completa) o 'prueba' (clase de prueba parcial)
alter table public.pagos
  add column if not exists tipo text not null default 'normal'
    check (tipo in ('normal', 'prueba'));

-- Precio de la clase de prueba en configuracion
insert into public.configuracion (clave, valor)
values ('precio_clase_prueba', '25000')
on conflict (clave) do nothing;
