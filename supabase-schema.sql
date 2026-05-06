create table if not exists public.candidate_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null,
  role text not null,
  resume_name text,
  resume_size integer,
  answers jsonb not null default '{}'::jsonb
);

alter table public.candidate_leads enable row level security;

create policy "Allow public lead capture"
on public.candidate_leads
for insert
to anon
with check (true);

create index if not exists candidate_leads_created_at_idx
on public.candidate_leads (created_at desc);
