-- Constraint único para que el upsert de envios_historial funcione correctamente
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'envios_historial_campana_telefono_key'
  ) then
    alter table public.envios_historial
      add constraint envios_historial_campana_telefono_key unique (campana, telefono);
  end if;
end $$;
