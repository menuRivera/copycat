alter table public.snapshots add column project_id uuid;
alter table public.snapshots add column kind text not null default 'competitor';
alter table public.snapshots alter column competitor_id drop not null;

update public.snapshots s
set project_id = c.project_id
from public.competitors c
where c.id = s.competitor_id;

alter table public.snapshots alter column project_id set not null;
alter table public.snapshots
  add constraint snapshots_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete cascade;
alter table public.snapshots
  add constraint snapshots_kind_check
  check (kind in ('competitor', 'own'));

create index snapshots_project_kind_created_idx
  on public.snapshots (project_id, kind, created_at desc);
