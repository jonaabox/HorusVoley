-- Tabla de grupos (para campañas de WhatsApp)
create table if not exists public.grupos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text,
  contactos   jsonb not null default '[]',
  created_at  timestamptz default now()
);

alter table public.grupos enable row level security;
create policy "authenticated_all" on public.grupos for all to authenticated using (true) with check (true);

-- Tabla de plantillas de mensajes
create table if not exists public.plantillas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  mensaje     text not null,
  created_at  timestamptz default now()
);

alter table public.plantillas enable row level security;
create policy "authenticated_all" on public.plantillas for all to authenticated using (true) with check (true);

-- Historial de envíos (para deduplicación por campaña)
create table if not exists public.envios_historial (
  id         uuid primary key default gen_random_uuid(),
  campana    text not null,
  telefono   text not null,
  created_at timestamptz default now()
);

alter table public.envios_historial enable row level security;
create policy "authenticated_all" on public.envios_historial for all to authenticated using (true) with check (true);
