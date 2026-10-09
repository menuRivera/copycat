import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from('diffs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'created');

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            Copycat
          </Link>
          <Link href="/diffs" className="text-sm text-zinc-600 hover:text-zinc-900">
            Review diffs
            {typeof count === 'number' && count > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span>{user?.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
