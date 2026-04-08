-- Tabla de horarios
create table if not exists public.horarios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  dia_semana  text not null,
  hora_inicio time not null,
  hora_fin    time not null,
  created_at  timestamptz default now()
);

alter table public.horarios enable row level security;
create policy "authenticated_all" on public.horarios for all to authenticated using (true) with check (true);

-- Seed inicial
insert into public.horarios (nombre, dia_semana, hora_inicio, hora_fin) values
  ('Grupo A', 'Sábado', '14:30', '16:30'),
  ('Grupo B', 'Sábado', '16:30', '18:30');

-- Columna en alumnos
alter table public.alumnos
  add column if not exists horario_id uuid references public.horarios(id) on delete set null;
