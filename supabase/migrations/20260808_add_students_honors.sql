alter table public.students
add column if not exists honors jsonb not null
default '{"activities":[],"competitions":[]}'::jsonb;
