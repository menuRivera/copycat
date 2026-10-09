drop policy "snapshots owner select" on public.snapshots;
create policy "snapshots owner select" on public.snapshots
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy "screenshots owner select" on public.screenshots;
create policy "screenshots owner select" on public.screenshots
  for select using (
    exists (
      select 1
      from public.snapshots s
      join public.projects p on p.id = s.project_id
      where s.id = snapshot_id and p.user_id = auth.uid()
    )
  );
