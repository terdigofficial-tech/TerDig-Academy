import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { normalizePhaseKey } from '@/lib/programs';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching programs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Programs fetched:', data?.length || 0);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in programs API:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, phase_key, target_label } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Nama program wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('programs')
      .insert({
        name,
        description,
        phase_key: normalizePhaseKey(phase_key),
        target_label: target_label?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating program:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Program created:', data.id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in POST programs:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
