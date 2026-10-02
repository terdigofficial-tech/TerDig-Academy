import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';

/**
 * POST /api/admin/broadcasts/[id]/send — tandai satu penerima sebagai terkirim.
 * Body: { recipient_id }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { id } = await params;
    const { recipient_id } = await req.json();
    if (!recipient_id) {
      return NextResponse.json({ error: 'recipient_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('broadcast_recipients')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', recipient_id)
      .eq('broadcast_id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in POST broadcast send:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
