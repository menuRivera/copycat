'use client';

import { motion } from 'motion/react';
import { itemVariants } from '@/components/motion-primitives';
import { approveDiff, denyDiff } from '@/lib/diff-actions';

export type DiffCardData = {
  id: string;
  title: string;
  description: string;
  instruction: string;
  type: string;
  status: string;
  created_at: string;
  commit: string | null;
  old_screenshot_url: string | null;
  new_screenshot_url: string | null;
};

const statusStyles: Record<string, string> = {
  created: 'bg-amber-100 text-amber-900',
  approved: 'bg-blue-100 text-blue-900',
  denied: 'bg-zinc-100 text-zinc-700',
  implemented: 'bg-emerald-100 text-emerald-900',
  failed: 'bg-red-100 text-red-900',
};

export function DiffCard({
  diff,
  projectId,
  repoUrl,
  showReviewActions,
}: {
  diff: DiffCardData;
  projectId: string;
  repoUrl: string | null;
  showReviewActions: boolean;
}) {
  const commitUrl = repoUrl && diff.commit ? `${repoUrl}/commit/${diff.commit}` : null;

  return (
    <motion.li
      variants={itemVariants}
      layout
      className="rounded-lg border border-border bg-surface shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-foreground">{diff.title}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[diff.status] ?? 'bg-zinc-100 text-zinc-600'}`}
            >
              {diff.status}
            </span>
            <span className="rounded-full bg-border-subtle px-2 py-0.5 text-xs text-muted">
              {diff.type}
            </span>
          </div>
          <p className="mt-1 text-xs text-faint tabular-nums">
            {new Date(diff.created_at).toLocaleString()}
          </p>
        </div>

        {showReviewActions ? (
          <div className="flex gap-2">
            <form action={approveDiff}>
              <input type="hidden" name="diff_id" value={diff.id} />
              <input type="hidden" name="project_id" value={projectId} />
              <button
                type="submit"
                className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
              >
                Approve
              </button>
            </form>
            <form action={denyDiff}>
              <input type="hidden" name="diff_id" value={diff.id} />
              <input type="hidden" name="project_id" value={projectId} />
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
              >
                Deny
              </button>
            </form>
          </div>
        ) : commitUrl ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-2 py-1 font-mono text-xs text-muted transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            {diff.commit?.slice(0, 7)}
          </a>
        ) : null}
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-muted">{diff.description}</p>

        {diff.old_screenshot_url || diff.new_screenshot_url ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {diff.old_screenshot_url ? (
              <figure>
                <figcaption className="mb-1 text-xs font-medium text-faint">Old</figcaption>
                <a
                  href={diff.old_screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                >
                  <img
                    src={diff.old_screenshot_url}
                    alt="Old state"
                    className="h-48 w-full rounded-md border border-border object-cover object-top"
                  />
                </a>
              </figure>
            ) : null}
            {diff.new_screenshot_url ? (
              <figure>
                <figcaption className="mb-1 text-xs font-medium text-faint">New</figcaption>
                <a
                  href={diff.new_screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                >
                  <img
                    src={diff.new_screenshot_url}
                    alt="New state"
                    className="h-48 w-full rounded-md border border-border object-cover object-top"
                  />
                </a>
              </figure>
            ) : null}
          </div>
        ) : null}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-faint transition-colors hover:text-muted">
            Agent instruction
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 font-mono text-xs text-muted">
            {diff.instruction}
          </pre>
        </details>
      </div>
    </motion.li>
  );
}
