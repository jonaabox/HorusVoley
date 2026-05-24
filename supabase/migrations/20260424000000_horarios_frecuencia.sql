-- Agrega columna frecuencia a horarios (null = visible para cualquier frecuencia)
alter table public.horarios
  add column if not exists frecuencia integer;

-- Los grupos de Sábado (A y B) son visibles para ambas frecuencias → quedan en null

-- Nuevos horarios exclusivos para 2 veces por semana
insert into public.horarios (nombre, dia_semana, hora_inicio, hora_fin, frecuencia) values
  ('Grupo C', 'Martes',    '19:30', '21:30', 2),
  ('Grupo D', 'Miércoles', '14:00', '16:00', 2);
