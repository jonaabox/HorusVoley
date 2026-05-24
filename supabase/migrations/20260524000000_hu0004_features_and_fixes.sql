-- 1. Agregar precio de 3 veces por semana en la tabla de configuración
insert into public.configuracion (clave, valor)
values ('precio_3_veces_semana', '160000')
on conflict (clave) do nothing;

insert into public.configuracion (clave, valor)
values ('dias_3_veces_semana', '2,4,6') -- Martes, Jueves, Sábado por defecto
on conflict (clave) do nothing;


-- 2. Crear tabla de pedidos de indumentaria
create table if not exists public.pedidos_indumentaria (
  id           uuid primary key default gen_random_uuid(),
  alumno_id    uuid not null references public.alumnos(id) on delete cascade,
  tipo_prenda  text not null check (tipo_prenda in ('camiseta', 'accesorios', 'indumentaria')),
  talle        text not null check (talle in ('P', 'G', 'GG')),
  monto_total  numeric(10,2) not null default 0 check (monto_total >= 0),
  monto_pagado numeric(10,2) not null default 0 check (monto_pagado >= 0),
  created_at   timestamptz default now()
);

-- Habilitar RLS para la tabla de indumentaria
alter table public.pedidos_indumentaria enable row level security;

-- Crear políticas para usuarios autenticados
create policy "authenticated_all" on public.pedidos_indumentaria 
  for all to authenticated using (true) with check (true);


-- 3. Crear tabla de notas de alumnos
create table if not exists public.alumno_notas (
  id         uuid primary key default gen_random_uuid(),
  alumno_id  uuid not null references public.alumnos(id) on delete cascade,
  contenido  text not null,
  created_at timestamptz default now()
);

-- Habilitar RLS para la tabla de notas
alter table public.alumno_notas enable row level security;

-- Crear políticas para usuarios autenticados
create policy "authenticated_all" on public.alumno_notas 
  for all to authenticated using (true) with check (true);
