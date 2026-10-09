import { redirect } from 'next/navigation';
import { FadeIn } from '@/components/motion-primitives';
import { createClient } from '@/lib/supabase/server';
import { sendMagicLink } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect('/');
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <FadeIn className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Copycat</h1>
        <p className="mt-1 text-sm text-muted">Sign in with a magic link.</p>

        {sent ? (
          <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Check your inbox for the sign-in link.
          </p>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error === 'email'
              ? 'Enter a valid email address.'
              : 'Could not send the link. Try again.'}
          </p>
        ) : null}

        <form action={sendMagicLink} className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-accent-600 focus:outline-2 focus:outline-offset-0 focus:outline-accent-600"
          />
          <button
            type="submit"
            className="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Send magic link
          </button>
        </form>
      </FadeIn>
    </main>
  );
}
