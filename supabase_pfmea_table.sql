-- ============================================================================
-- PFMEA ortak proje tablosu  (Kalite Kontrol Supabase projesi: nnubrxbpthmkitueixbh)
-- ----------------------------------------------------------------------------
-- Bu script SADECE yeni bir tablo (pfmea_projects) ve ona ait politikalari olusturur.
-- Mevcut tablolarina / verilerine / politikalarina HIC DOKUNMAZ. Guvenle calistirilabilir.
--
-- Nasil: Supabase paneli -> Kalite projesi -> SQL Editor -> bu metni yapistir -> Run.
-- ============================================================================

create table if not exists public.pfmea_projects (
  id          text primary key,
  name        text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- updated_at her guncellemede otomatik tazelensin
create or replace function public.pfmea_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_pfmea_touch on public.pfmea_projects;
create trigger trg_pfmea_touch
  before update on public.pfmea_projects
  for each row execute function public.pfmea_touch_updated_at();

-- Row Level Security: yalnizca BU tabloya politika; digerleri etkilenmez.
alter table public.pfmea_projects enable row level security;

-- Ortak calisma alani: anon (uygulama anahtari) okuma + yazma yapabilir.
drop policy if exists "pfmea anon select" on public.pfmea_projects;
create policy "pfmea anon select" on public.pfmea_projects
  for select using (true);

drop policy if exists "pfmea anon insert" on public.pfmea_projects;
create policy "pfmea anon insert" on public.pfmea_projects
  for insert with check (true);

drop policy if exists "pfmea anon update" on public.pfmea_projects;
create policy "pfmea anon update" on public.pfmea_projects
  for update using (true) with check (true);

drop policy if exists "pfmea anon delete" on public.pfmea_projects;
create policy "pfmea anon delete" on public.pfmea_projects
  for delete using (true);
