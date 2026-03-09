// app/api/admin/create-user/route.ts
// Crée un utilisateur côté serveur avec le service_role
// → Le profil est créé immédiatement et apparaît dans la liste
// → Remplace le signUp() côté client qui ne créait pas le profil en prod
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe minimum 6 caractères' }, { status: 400 });
    }

    // Vérifier que l'appelant est admin
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé — admin uniquement' }, { status: 403 });
    }

    // Créer l'utilisateur avec le service_role (bypass email confirmation)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // ← pas besoin de confirmer l'email
      user_metadata: { full_name, role },
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    // Créer le profil manuellement (double sécurité si trigger absent)
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