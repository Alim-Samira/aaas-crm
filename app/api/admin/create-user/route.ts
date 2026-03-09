// app/api/admin/create-user/route.ts
//  FIX 400 : détecte "user already exists" + message clair
//  FIX : await createServerSupabaseClient() + export dynamic
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, role } = body;

    if (!email?.trim())    return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    if (!password?.trim()) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Mot de passe minimum 6 caractères' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (callerProfile?.role !== 'admin')
      return NextResponse.json({ error: 'Accès refusé — admin uniquement' }, { status: 403 });

    // Jamais donner le rôle admin via ce formulaire
    const finalRole = (!role || role === 'admin') ? 'commercial' : role;

    const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ── Chemin 1 : avec service_role (recommandé) ─────────────────
    if (SERVICE_KEY) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email:          email.trim(),
        password,
        email_confirm:  true,
        user_metadata:  { full_name: full_name?.trim() || null, role: finalRole },
      });

      if (createErr) {
        const raw = createErr.message.toLowerCase();
        let msg = createErr.message;
        if (raw.includes('already') || raw.includes('registered') || raw.includes('exists'))
          msg = `Un compte avec l'adresse ${email} existe déjà.`;
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      await adminClient.from('profiles').upsert(
        { id: newUser.user.id, email: email.trim(), full_name: full_name?.trim() || null, role: finalRole },
        { onConflict: 'id' }
      );

      return NextResponse.json({ success: true, userId: newUser.user.id });
    }

    // ── Chemin 2 : fallback signUp (sans service_role) ─────────────
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: full_name?.trim() || null, role: finalRole } },
    });

    if (signUpErr) {
      const raw = signUpErr.message.toLowerCase();
      let msg = signUpErr.message;
      if (raw.includes('already') || raw.includes('registered'))
        msg = `Un compte avec l'adresse ${email} existe déjà.`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, email: email.trim(), full_name: full_name?.trim() || null, role: finalRole },
        { onConflict: 'id' }
      );
    }

    return NextResponse.json({
      success: true,
      note: '⚠️ Confirmation email requise. Ajoutez SUPABASE_SERVICE_ROLE_KEY dans Vercel pour éviter ça.',
    });

  } catch (err: any) {
    console.error('[create-user]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}