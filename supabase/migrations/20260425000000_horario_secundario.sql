-- Segundo horario para alumnos de 2 veces por semana
alter table public.alumnos
  add column if not exists horario_secundario_id uuid references public.horarios(id) on delete set null;
