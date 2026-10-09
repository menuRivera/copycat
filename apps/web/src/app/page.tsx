import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { MotionItem, MotionList } from '@/components/motion-primitives';
import { createClient } from '@/lib/supabase/server';
import { ProjectForm } from './project-form';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, repo_url, deployment_url, created_at, competitors(id, name, url, active)')
    .order('created_at', { ascending: false });

  const { data: pendingDiffs } = await supabase
    .from('diffs')
    .select('project_id')
    .eq('status', 'created');

  const pendingByProject = new Map<string, number>();
  for (const diff of pendingDiffs ?? []) {
    pendingByProject.set(diff.project_id, (pendingByProject.get(diff.project_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader />

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_380px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        <section className="flex flex-col lg:min-h-0">
          <h2 className="text-base font-medium text-foreground">Projects</h2>
          <p className="mt-1 text-sm text-muted">Select a project to review its diffs.</p>
          {error ? <p className="mt-3 text-sm text-red-700">{error.message}</p> : null}
          {projects && projects.length > 0 ? (
            <MotionList className="mt-3 flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
              {projects.map((project) => {
                const pending = pendingByProject.get(project.id) ?? 0;
                return (
                  <MotionItem key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="block rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-medium text-foreground">{project.name}</h3>
                        {pending > 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 tabular-nums">
                            {pending} pending
                          </span>
                        ) : (
                          <span className="text-xs text-faint">no pending diffs</span>
                        )}
                      </div>
                      <p className="mt-1 break-all text-sm text-muted">{project.repo_url}</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {project.competitors.map((competitor) => (
                          <li
                            key={competitor.id}
                            className="rounded-full bg-border-subtle px-2.5 py-0.5 text-xs text-muted"
                          >
                            {competitor.name}
                          </li>
                        ))}
                      </ul>
                    </Link>
                  </MotionItem>
                );
              })}
            </MotionList>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No projects yet. Create one to start monitoring.
            </p>
          )}
        </section>

        <section className="self-start rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-base font-medium text-foreground">New project</h2>
          <div className="mt-4">
            <ProjectForm />
          </div>
        </section>
      </main>
    </div>
  );
}
