import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Database } from '@copycat/core';
import { AppHeader } from '@/components/app-header';
import { DiffCard, type DiffCardData } from '@/components/diff-card';
import { MotionList } from '@/components/motion-primitives';
import { TabNav } from '@/components/tab-nav';
import { createClient } from '@/lib/supabase/server';

type DiffStatus = Database['public']['Enums']['diff_status'];

const TABS: Record<string, { label: string; statuses: DiffStatus[]; empty: string }> = {
  pending: {
    label: 'Pending',
    statuses: ['created'],
    empty: 'No diffs waiting for review.',
  },
  decided: {
    label: 'Decided',
    statuses: ['approved', 'denied'],
    empty: 'No decided diffs yet.',
  },
  shipped: {
    label: 'Shipped',
    statuses: ['implemented', 'failed'],
    empty: 'No implemented or failed diffs yet.',
  },
};

export default async function ProjectDiffsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const { tab } = await searchParams;
  const activeTab = tab && tab in TABS ? tab : 'pending';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, repo_url')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: statusRows } = await supabase
    .from('diffs')
    .select('status')
    .eq('project_id', projectId);

  const counts: Record<string, number> = { pending: 0, decided: 0, shipped: 0 };
  for (const row of statusRows ?? []) {
    if (row.status === 'created') {
      counts.pending += 1;
    } else if (row.status === 'approved' || row.status === 'denied') {
      counts.decided += 1;
    } else {
      counts.shipped += 1;
    }
  }

  const { data: diffs, error } = await supabase
    .from('diffs')
    .select(
      'id, title, description, instruction, type, status, created_at, commit, old:screenshots!old_screenshot_id ( screenshot_public_url ), new:screenshots!new_screenshot_id ( screenshot_public_url )',
    )
    .eq('project_id', projectId)
    .in('status', TABS[activeTab].statuses)
    .order('created_at', { ascending: activeTab === 'pending' });

  const cards: DiffCardData[] = (diffs ?? []).map((diff) => ({
    id: diff.id,
    title: diff.title,
    description: diff.description,
    instruction: diff.instruction,
    type: diff.type,
    status: diff.status,
    created_at: diff.created_at,
    commit: diff.commit,
    old_screenshot_url: diff.old?.screenshot_public_url ?? null,
    new_screenshot_url: diff.new?.screenshot_public_url ?? null,
  }));

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 lg:min-h-0">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-muted transition-colors hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Projects
          </Link>
          <span className="text-faint">/</span>
          <span className="font-medium text-foreground">{project.name}</span>
        </nav>

        <TabNav
          projectId={project.id}
          activeTab={activeTab}
          tabs={Object.entries(TABS).map(([key, config]) => ({
            key,
            label: config.label,
            count: counts[key],
          }))}
        />

        {error ? <p className="mt-4 text-sm text-red-700">{error.message}</p> : null}

        {cards.length > 0 ? (
          <MotionList className="mt-5 flex flex-col gap-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable] lg:pb-2">
            {cards.map((diff) => (
              <DiffCard
                key={diff.id}
                diff={diff}
                projectId={project.id}
                repoUrl={project.repo_url}
                showReviewActions={activeTab === 'pending'}
              />
            ))}
          </MotionList>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
            {TABS[activeTab].empty}
          </p>
        )}
      </main>
    </div>
  );
}
