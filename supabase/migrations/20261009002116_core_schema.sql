create type public.diff_type as enum ('snapshot', 'analytic');
create type public.diff_status as enum ('created', 'approved', 'denied', 'implemented', 'failed');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  active boolean not null default true,
  name text not null,
  created_at timestamptz not null default now(),
  repo_url text not null,
  deployment_url text,
  version text
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  active boolean not null default true,
  name text not null,
  url text not null
);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  created_at timestamptz not null default now(),
  dom_snapshot text not null,
  dom_hash text not null
);

create table public.screenshots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  snapshot_id uuid not null references public.snapshots (id) on delete cascade,
  screenshot_bucket_id text not null,
  screenshot_public_url text not null
);

create table public.diffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete set null,
  type public.diff_type not null,
  old_screenshot_id uuid references public.screenshots (id) on delete set null,
  new_screenshot_id uuid references public.screenshots (id) on delete set null,
  title text not null,
  description text not null,
  instruction text not null,
  statement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.diff_status not null default 'created',
  commit text
);

create index competitors_project_idx on public.competitors (project_id);
create index snapshots_competitor_created_idx on public.snapshots (competitor_id, created_at desc);
create index screenshots_snapshot_idx on public.screenshots (snapshot_id);
create index diffs_status_created_idx on public.diffs (status, created_at);
create index diffs_project_idx on public.diffs (project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger diffs_set_updated_at
before update on public.diffs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (new.id, new.raw_user_meta_data ->> 'name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
