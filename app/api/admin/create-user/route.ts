// app/api/admin/create-user/route.ts
// ✅ FIX : await createServerSupabaseClient() + export dynamic
// Crée un utilisateur avec service_role → profil immédiatement visible
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe minimum 6 caractères' }, { status: 400 });
    }

    // ✅ await obligatoire
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé — admin uniquement' }, { status: 403 });
    }

    // Service role client pour bypass email confirmation
    const SUPABASE_URL              = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      // Fallback : signUp normal si pas de service role key
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name, role } },
      });
      if (signUpErr) return NextResponse.json({ error: signUpErr.message }, { status: 400 });

      if (data.user) {
        const finalRole = role === 'admin' ? 'commercial' : (role ?? 'commercial');
        await supabase.from('profiles').upsert({
          id: data.user.id, email, full_name: full_name || null, role: finalRole,
        }, { onConflict: 'id' });
      }
      return NextResponse.json({ success: true, note: 'signUp fallback — email confirmation may be required' });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    const finalRole = role === 'admin' ? 'commercial' : (role ?? 'commercial');
    await adminClient.from('profiles').upsert({
      id:        newUser.user.id,
      email,
      full_name: full_name || null,
      role:      finalRole,
    }, { onConflict: 'id' });

    return NextResponse.json({ success: true, userId: newUser.user.id });

  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}