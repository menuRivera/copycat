alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.competitors enable row level security;
alter table public.snapshots enable row level security;
alter table public.screenshots enable row level security;
alter table public.diffs enable row level security;

create policy "users select own" on public.users
  for select using (id = auth.uid());

create policy "users update own" on public.users
  for update using (id = auth.uid());

create policy "projects owner select" on public.projects
  for select using (user_id = auth.uid());
create policy "projects owner insert" on public.projects
  for insert with check (user_id = auth.uid());
create policy "projects owner update" on public.projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projects owner delete" on public.projects
  for delete using (user_id = auth.uid());

create policy "competitors owner select" on public.competitors
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
create policy "competitors owner insert" on public.competitors
  for insert with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
create policy "competitors owner update" on public.competitors
  for update using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
create policy "competitors owner delete" on public.competitors
  for delete using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "diffs owner select" on public.diffs
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
create policy "diffs owner update" on public.diffs
  for update using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "snapshots owner select" on public.snapshots
  for select using (
    exists (
      select 1
      from public.competitors c
      join public.projects p on p.id = c.project_id
      where c.id = competitor_id and p.user_id = auth.uid()
    )
  );

create policy "screenshots owner select" on public.screenshots
  for select using (
    exists (
      select 1
      from public.snapshots s
      join public.competitors c on c.id = s.competitor_id
      join public.projects p on p.id = c.project_id
      where s.id = snapshot_id and p.user_id = auth.uid()
    )
  );
