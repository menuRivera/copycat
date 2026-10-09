import { createClient } from '@/lib/supabase/server';

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-foreground">Copycat</span>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{user?.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
