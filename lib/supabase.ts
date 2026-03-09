// lib/supabase.ts
// ─────────────────────────────────────────────────────────────
// Browser-safe singleton Supabase client
// ─────────────────────────────────────────────────────────────
// FIX: "Navigator LockManager lock timed out" est causé par OneDrive/WSL
// qui bloque l'API navigator.locks utilisée par @supabase/ssr pour stocker
// les tokens. La solution : désactiver le lock et utiliser le localStorage direct.

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Désactive le LockManager — corrige l'erreur "lock timed out 10000ms"
        // Nécessaire quand le projet est dans OneDrive ou exécuté via WSL
        lock: async (name: string, acquireTimeout: number, fn: Function) => {
          // Bypasse le lock : exécute directement sans attendre
          return fn();
        },
        // Stockage des tokens dans localStorage classique
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  );

  return client;
}

// Export direct pour compatibilité
export const supabase = getSupabaseClient();