// lib/supabase.ts
//    FIX DEFENSIF : ne crash pas si variables d'env absentes
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Variables Supabase manquantes dans Vercel → Settings → Environment Variables');
  }

  client = createBrowserClient(
    url ?? 'https://placeholder.supabase.co',
    key ?? 'placeholder-anon-key',
    {
      auth: {
        lock: async (_name: string, _timeout: number, fn: Function) => fn(),
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  );

  return client;
}

export const supabase = getSupabaseClient();