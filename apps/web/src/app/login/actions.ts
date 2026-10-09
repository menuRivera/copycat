'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!emailPattern.test(email)) {
    redirect('/login?error=email');
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get('origin') ?? `http://${headerList.get('host')}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  redirect(error ? '/login?error=send' : '/login?sent=1');
}
