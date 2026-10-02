import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';

/** GET /api/admin/broadcasts/[id] — detail + daftar penerima. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: broadcast, error: bErr } = await supabase
      .from('broadcasts')
      .select('id, title, message_template, audience, created_at')
      .eq('id', id)
      .single();
    if (bErr || !broadcast) {
      return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
    }

    const { data: recipients, error: rErr } = await supabase
      .from('broadcast_recipients')
      .select('id, student_id, parent_name, parent_phone, personalized_text, status, sent_at, students(full_name)')
      .eq('broadcast_id', id)
      .order('created_at');
    if (rErr) throw rErr;

    return NextResponse.json({ ...broadcast, recipients: recipients || [] });
  } catch (err: any) {
    console.error('❌ Error in GET broadcast detail:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/admin/broadcasts/[id] — hapus broadcast + semua penerima. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Error in DELETE broadcast:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
