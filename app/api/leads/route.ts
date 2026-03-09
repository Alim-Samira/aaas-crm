// app/api/leads/route.ts
// ─────────────────────────────────────────────────────────────
// Leads REST API – GET (list) / POST (create)
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Await the resolved supabase client
    const supabase = await createServerSupabaseClient();  // <-- Await the promise

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('leads')
      .select('*, contact:contacts(first_name, last_name, email, company:companies(name))')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in GET request:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Await the resolved supabase client
    const supabase = await createServerSupabaseClient();  // <-- Await the promise

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...body, assigned_to: body.assigned_to ?? user.id })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST request:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}