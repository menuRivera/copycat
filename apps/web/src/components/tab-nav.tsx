'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export type TabItem = {
  key: string;
  label: string;
  count: number;
};

export function TabNav({
  projectId,
  tabs,
  activeTab,
}: {
  projectId: string;
  tabs: TabItem[];
  activeTab: string;
}) {
  return (
    <div className="mt-5 flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={`/projects/${projectId}?tab=${tab.key}`}
            className={`relative -mb-px px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 ${
              active ? 'font-medium text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-faint tabular-nums">{tab.count}</span>
            {active ? (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-600"
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
