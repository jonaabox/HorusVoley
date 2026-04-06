-- Create a type for the validation result
create type public.resultado_validacion as (
  valido boolean,
  alumno_nombre text,
  fecha_pago date,
  monto numeric,
  mes integer,
  anio integer
);

-- Function to validate receipt securely without exposing the entire table (Bypasses RLS safely)
create or replace function public.validar_recibo_publico(codigo_busqueda text)
returns public.resultado_validacion
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.resultado_validacion;
  pago_record record;
begin
  -- Validate input length
  if length(codigo_busqueda) != 8 then
    resultado.valido := false;
    return resultado;
  end if;

  -- Search for the unique payment matching the first 8 characters of the UUID
  select p.*, a.nombre_completo 
  into pago_record
  from public.pagos p
  join public.alumnos a on p.alumno_id = a.id
  where p.id::text ilike codigo_busqueda || '%'
  limit 1;

  if found then
    resultado.valido := true;
    resultado.alumno_nombre := pago_record.nombre_completo;
    resultado.fecha_pago := pago_record.fecha_pago;
    resultado.monto := pago_record.monto;
    resultado.mes := pago_record.mes_correspondiente;
    resultado.anio := pago_record.año_correspondiente;
  else
    resultado.valido := false;
  end if;

  return resultado;
end;
$$;
