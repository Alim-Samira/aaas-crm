// lib/supabase-server.ts
// ─────────────────────────────────────────────────────────────
// Supabase client pour Server Components uniquement
// Utilise next/headers — 
// ─────────────────────────────────────────────────────────────
//FIX TypeScript build error: "Parameter 'name' implicitly has an 'any' type"
// Ce fichier est UNIQUEMENT pour les Server Components.
// NE PAS importer dans des fichiers 'use client'.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignoré dans les Server Components (read-only)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // ignoré
          }
        },
      },
    }
  );
}