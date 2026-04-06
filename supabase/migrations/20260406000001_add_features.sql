-- Agregar frecuencia y nivel a alumnos
alter table public.alumnos
  add column if not exists frecuencia integer not null default 2 check (frecuencia in (1, 2)),
  add column if not exists nivel text not null default 'principiante' check (nivel in ('principiante', 'intermedio', 'avanzado'));

-- Tabla de asistencia
create table if not exists public.asistencia (
  id         uuid primary key default gen_random_uuid(),
  alumno_id  uuid not null references public.alumnos(id) on delete cascade,
  fecha      date not null default current_date,
  presente   boolean not null default true,
  created_at timestamptz default now(),
  unique(alumno_id, fecha)
);

-- Tabla de configuracion (precios y parametros)
create table if not exists public.configuracion (
  clave text primary key,
  valor text not null
);

insert into public.configuracion (clave, valor) values
  ('precio_1_vez_semana',    '70000'),
  ('precio_2_veces_semana',  '120000'),
  ('dia_vencimiento_cuota',  '5')
on conflict (clave) do nothing;

-- RLS
alter table public.asistencia    enable row level security;
alter table public.configuracion enable row level security;

create policy "authenticated_all" on public.asistencia    for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.configuracion for all to authenticated using (true) with check (true);
