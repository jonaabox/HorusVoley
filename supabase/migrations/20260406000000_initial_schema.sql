-- Tabla de alumnos
create table if not exists public.alumnos (
  id                uuid primary key default gen_random_uuid(),
  nombre_completo   text not null,
  fecha_nacimiento  date,
  telefono          text,
  fecha_inscripcion date not null default current_date,
  estado            text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at        timestamptz default now()
);

-- Tabla de pagos
create table if not exists public.pagos (
  id                  uuid primary key default gen_random_uuid(),
  alumno_id           uuid not null references public.alumnos(id) on delete cascade,
  monto               numeric(10,2) not null,
  fecha_pago          date not null default current_date,
  mes_correspondiente integer not null check (mes_correspondiente between 1 and 12),
  año_correspondiente integer not null,
  created_at          timestamptz default now()
);

-- Tabla de cuotas
create table if not exists public.cuotas (
  id               uuid primary key default gen_random_uuid(),
  alumno_id        uuid not null references public.alumnos(id) on delete cascade,
  fecha_vencimiento date not null,
  estado_pago      text not null default 'pendiente' check (estado_pago in ('pendiente', 'pagado')),
  created_at       timestamptz default now()
);

-- RLS: habilitar para todas las tablas
alter table public.alumnos enable row level security;
alter table public.pagos    enable row level security;
alter table public.cuotas   enable row level security;

-- Políticas: solo usuarios autenticados pueden ver y modificar datos
create policy "authenticated_all" on public.alumnos for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.pagos    for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.cuotas   for all to authenticated using (true) with check (true);
