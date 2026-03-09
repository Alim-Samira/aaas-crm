// app/api/leads/route.ts
// ✅ FIX : await createServerSupabaseClient()
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // ✅ await obligatoire
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status    = searchParams.get('status');
  const contactId = searchParams.get('contact_id');

  let query = supabase
    .from('leads')
    .select('*, contact:contacts(first_name, last_name, email)')
    .order('created_at', { ascending: false });

  if (status)    query = query.eq('status',     status);
  if (contactId) query = query.eq('contact_id', contactId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, value, status, contact_id, notes } = body;

  if (!title) return NextResponse.json({ error: 'title requis' }, { status: 400 });

  const { data, error } = await supabase
    .from('leads')
    .insert({
      title,
      value:      parseFloat(value) || 0,
      status:     status ?? 'new',
      contact_id: contact_id ?? null,
      notes:      notes ?? null,
      assigned_to: user.id,
    })
    .select('*, contact:contacts(first_name, last_name, email)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}