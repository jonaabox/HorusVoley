-- Bucket de storage (público para links compartibles)
insert into storage.buckets (id, name, public)
values ('materiales', 'materiales', true)
on conflict (id) do nothing;

-- Política de storage: solo autenticados pueden subir y eliminar
create policy "authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'materiales');

create policy "authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'materiales');

create policy "public read" on storage.objects
  for select using (bucket_id = 'materiales');

-- Tabla de materiales
create table if not exists public.materiales (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  storage_path text not null,
  public_url   text not null,
  created_at   timestamptz default now()
);

alter table public.materiales enable row level security;
create policy "authenticated_all" on public.materiales for all to authenticated using (true) with check (true);
