import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { createClient } from '@/lib/supabase/server';
import { approveDiff, denyDiff } from './actions';

export default async function DiffsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: diffs, error } = await supabase
    .from('diffs')
    .select(
      'id, title, description, instruction, type, created_at, project:projects ( name ), old:screenshots!old_screenshot_id ( screenshot_public_url ), new:screenshots!new_screenshot_id ( screenshot_public_url )',
    )
    .eq('status', 'created')
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="text-base font-semibold text-zinc-900">Diffs waiting for review</h1>
        <p className="mt-1 text-sm text-zinc-600">Older first. Approve to queue an implementation, deny to discard.</p>

        {error ? <p className="mt-4 text-sm text-red-700">{error.message}</p> : null}

        {diffs && diffs.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-5">
            {diffs.map((diff) => (
              <li key={diff.id} className="rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-zinc-900">{diff.title}</h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {diff.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {diff.project?.name ?? 'unknown project'} ·{' '}
                      {new Date(diff.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={approveDiff}>
                      <input type="hidden" name="diff_id" value={diff.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={denyDiff}>
                      <input type="hidden" name="diff_id" value={diff.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                      >
                        Deny
                      </button>
                    </form>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <p className="text-sm text-zinc-700">{diff.description}</p>

                  {diff.old?.screenshot_public_url || diff.new?.screenshot_public_url ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {diff.old?.screenshot_public_url ? (
                        <figure>
                          <figcaption className="mb-1 text-xs font-medium text-zinc-500">Old</figcaption>
                          <img
                            src={diff.old.screenshot_public_url}
                            alt="Old state"
                            className="w-full rounded-md border border-zinc-200"
                          />
                        </figure>
                      ) : null}
                      {diff.new?.screenshot_public_url ? (
                        <figure>
                          <figcaption className="mb-1 text-xs font-medium text-zinc-500">New</figcaption>
                          <img
                            src={diff.new.screenshot_public_url}
                            alt="New state"
                            className="w-full rounded-md border border-zinc-200"
                          />
                        </figure>
                      ) : null}
                    </div>
                  ) : null}

                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                      Agent instruction
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
                      {diff.instruction}
                    </pre>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-500">
            No diffs waiting for review.
          </p>
        )}
      </main>
    </div>
  );
}
