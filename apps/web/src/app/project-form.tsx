'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useActionState, useState } from 'react';
import { createProject } from './actions';
import { initialProjectFormState } from './project-form-state';

type CompetitorRow = { key: number };

const inputStyles =
  'w-full rounded-md border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-accent-600 focus:outline-2 focus:outline-offset-0 focus:outline-accent-600';

function Field({
  label,
  name,
  error,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        className={inputStyles}
      />
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function ProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initialProjectFormState);
  const [rows, setRows] = useState<CompetitorRow[]>([{ key: 1 }]);
  const [nextKey, setNextKey] = useState(2);

  function addRow() {
    setRows((current) => [...current, { key: nextKey }]);
    setNextKey((current) => current + 1);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Project name" name="name" error={state.fieldErrors.name} required />
      <Field
        label="Repository URL"
        name="repo_url"
        error={state.fieldErrors.repo_url}
        placeholder="https://github.com/you/repo"
        required
      />
      <Field
        label="Deployment URL (optional)"
        name="deployment_url"
        error={state.fieldErrors.deployment_url}
        placeholder="https://your-app.example.com"
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Competitors (at least one)</span>
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <motion.div
              key={row.key}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex gap-2"
            >
              <input name="competitor_name" placeholder="Name (optional)" className={`${inputStyles} w-32`} />
              <input
                name="competitor_url"
                placeholder="https://rival.example.com"
                required
                className={`${inputStyles} flex-1`}
              />
              {rows.length > 1 ? (
                <motion.button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-md px-2 text-sm text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                >
                  Remove
                </motion.button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={addRow}
          className="self-start rounded-md border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          Add competitor
        </button>
        {state.fieldErrors.competitors ? (
          <p className="text-xs text-red-700">{state.fieldErrors.competitors}</p>
        ) : null}
      </div>

      {state.formError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{state.formError}</p>
      ) : null}

      <motion.button
        type="submit"
        disabled={pending}
        whileTap={{ scale: 0.98 }}
        className="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? 'Creating...' : 'Create project'}
      </motion.button>
    </form>
  );
}
