import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
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

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <AppHeader />

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="text-base font-semibold text-zinc-900">Projects</h2>
          {error ? <p className="mt-3 text-sm text-red-700">{error.message}</p> : null}
          {projects && projects.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-3">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium text-zinc-900">{project.name}</h3>
                    <span className="text-xs text-zinc-500">
                      created {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-sm text-zinc-600">{project.repo_url}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {project.competitors.map((competitor) => (
                      <li
                        key={competitor.id}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700"
                      >
                        {competitor.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              No projects yet. Create one to start monitoring.
            </p>
          )}
        </section>

        <section className="self-start rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">New project</h2>
          <div className="mt-4">
            <ProjectForm />
          </div>
        </section>
      </main>
    </div>
  );
}
