insert into public.configuracion (clave, valor)
values ('dias_aviso_vencimiento', '5')
on conflict (clave) do nothing;
