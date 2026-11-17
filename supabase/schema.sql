-- ============================================================
-- Vitalis Virtual Clinic — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- 1) Appointments (full appointment object stored as JSONB for flexibility)
create table if not exists public.appointments (
  id           text primary key,
  patient_name text,
  status       text,
  urgency      text,
  data         jsonb not null,
  created_at   timestamptz not null default now()
);

-- 2) E-prescriptions
create table if not exists public.prescriptions (
  id             text primary key,
  appointment_id text,
  patient_name   text,
  data           jsonb not null,
  created_at     timestamptz not null default now()
);

-- 3) Patient portal registrations
create table if not exists public.portal_patients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  dob        date,
  specialty  text,
  message    text,
  created_at timestamptz not null default now()
);

-- Row Level Security: the app uses the anon/publishable key, so these
-- permissive demo policies let it read and write directly.
alter table public.appointments    enable row level security;
alter table public.prescriptions   enable row level security;
alter table public.portal_patients enable row level security;

create policy "anon full access appointments"  on public.appointments    for all using (true) with check (true);
create policy "anon full access prescriptions" on public.prescriptions   for all using (true) with check (true);
create policy "anon full access portal"        on public.portal_patients for all using (true) with check (true);
