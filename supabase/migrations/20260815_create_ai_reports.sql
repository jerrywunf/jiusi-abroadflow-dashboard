create extension if not exists pgcrypto;

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  content jsonb not null,
  model text not null,
  version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_reports_student_id_key unique (student_id)
);

create index if not exists ai_reports_updated_at_idx
  on public.ai_reports (updated_at desc);

create or replace function public.set_ai_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_reports_updated_at on public.ai_reports;
create trigger set_ai_reports_updated_at
before update on public.ai_reports
for each row execute function public.set_ai_reports_updated_at();

alter table public.ai_reports enable row level security;

-- MVP compatibility: the current app has no user authentication and uses the
-- publishable key. Replace this policy with organization/user-scoped policies
-- after authentication is introduced, or use a server-only service role key.
drop policy if exists "MVP can manage AI reports" on public.ai_reports;
create policy "MVP can manage AI reports"
on public.ai_reports
for all
to anon, authenticated
using (true)
with check (true);

notify pgrst, 'reload schema';
