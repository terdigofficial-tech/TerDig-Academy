import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: Detail laporan by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: report, error } = await supabase
    .from('parent_reports')
    .select(`
      *,
      students (id, full_name, grade_id),
      sessions (id, title, date, target_level, episodes (episode_number, title))
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Error fetching report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!report) {
    return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ data: report });
}

// PUT: Update status laporan (pending → sent)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const { wa_status } = body;

  if (!['pending', 'sent', 'failed'].includes(wa_status)) {
    return NextResponse.json(
      { error: 'Status tidak valid' },
      { status: 400 }
    );
  }

  const updateData: Record<string, any> = { wa_status };

  // Jika status = 'sent', set sent_at
  if (wa_status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }

  const { data: report, error } = await supabase
    .from('parent_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: report });
}
