import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { normalizePhaseKey } from '@/lib/programs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, description, phase_key, target_label } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Nama program wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('programs')
      .update({
        name,
        description,
        phase_key: normalizePhaseKey(phase_key),
        target_label: target_label?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating program:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Program updated:', id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in PUT programs:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = createServerClient();
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting program:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Program deleted:', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Error in DELETE programs:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
