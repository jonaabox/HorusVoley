-- Tabla de logs de la aplicación
create table if not exists public.app_logs (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  level      text not null check (level in ('info', 'warning', 'error', 'critical')),
  module     text not null,
  message    text not null,
  user_id    uuid references auth.users(id) on delete set null,
  metadata   jsonb
);

-- Índices para filtrado eficiente
create index if not exists app_logs_level_idx      on public.app_logs (level);
create index if not exists app_logs_created_at_idx on public.app_logs (created_at desc);
create index if not exists app_logs_module_idx     on public.app_logs (module);

-- RLS: solo usuarios autenticados (administrador)
alter table public.app_logs enable row level security;

create policy "logs_insert" on public.app_logs
  for insert to authenticated with check (true);

create policy "logs_select" on public.app_logs
  for select to authenticated using (true);

create policy "logs_delete" on public.app_logs
  for delete to authenticated using (true);

-- Función de limpieza: elimina logs más antiguos de N días
create or replace function public.limpiar_logs_antiguos(dias integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  eliminados integer;
begin
  delete from public.app_logs
  where created_at < now() - (dias || ' days')::interval;
  get diagnostics eliminados = row_count;
  return eliminados;
end;
$$;
