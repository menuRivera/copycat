'use client';

import { useActionState, useState } from 'react';
import { createProject } from './actions';
import { initialProjectFormState } from './project-form-state';

type CompetitorRow = { key: number };

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
      <label className="text-sm font-medium text-zinc-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
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
        <span className="text-sm font-medium text-zinc-700">Competitors (at least one)</span>
        {rows.map((row) => (
          <div key={row.key} className="flex gap-2">
            <input
              name="competitor_name"
              placeholder="Name (optional)"
              className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
            <input
              name="competitor_url"
              placeholder="https://rival.example.com"
              required
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="rounded-md border border-zinc-300 px-2 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="self-start rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
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

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? 'Creating...' : 'Create project'}
      </button>
    </form>
  );
}
