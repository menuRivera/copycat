import { redirect } from 'next/navigation';
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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Copycat</h1>
        <p className="mt-1 text-sm text-zinc-600">Sign in with a magic link.</p>

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
          <label className="text-sm font-medium text-zinc-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  );
}
