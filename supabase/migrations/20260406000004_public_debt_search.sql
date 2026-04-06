-- Create a function to safely search a student and their payment history
create or replace function public.buscar_alumno_deuda_publico(busqueda text)
returns table (
  alumno_id uuid,
  nombre_completo text,
  fecha_inscripcion date,
  pagos json
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Require at least 4 characters to prevent mass scraping
  if length(busqueda) < 4 then
    return;
  end if;

  return query
  select 
    a.id as alumno_id,
    a.nombre_completo,
    a.fecha_inscripcion,
    COALESCE(
      json_agg(
        json_build_object(
          'mes', p.mes_correspondiente,
          'anio', p.año_correspondiente
        )
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::json
    ) as pagos
  from public.alumnos a
  left join public.pagos p on p.alumno_id = a.id
  where a.nombre_completo ilike '%' || busqueda || '%'
  group by a.id, a.nombre_completo, a.fecha_inscripcion
  limit 5;
end;
$$;
