import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: List semua laporan untuk sesi tertentu
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = createServerClient();

  const { data: reports, error } = await supabase
    .from('parent_reports')
    .select(`
      *,
      students (id, full_name, grade_id, parent_name, parent_phone)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: reports || [] });
}
