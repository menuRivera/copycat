create type public.diff_impact as enum ('low', 'medium', 'high');
create type public.validation_status as enum ('none', 'pending', 'passed', 'failed', 'skipped');

alter type public.diff_status add value if not exists 'pr_open';

alter table public.diffs
  add column area text,
  add column impact public.diff_impact,
  add column expected_outcome text,
  add column pr_url text,
  add column validation_status public.validation_status not null default 'none',
  add column validation_notes text;

alter table public.diffs
  add constraint diffs_area_length_check check (area is null or char_length(area) <= 120),
  add constraint diffs_expected_outcome_length_check
    check (expected_outcome is null or char_length(expected_outcome) <= 2000);

alter table public.projects
  add column ingest_token text not null
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

create unique index projects_ingest_token_idx on public.projects (ingest_token);
