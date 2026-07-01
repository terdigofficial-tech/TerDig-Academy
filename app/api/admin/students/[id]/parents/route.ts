import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: List semua parents untuk siswa tertentu
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  const supabase = createServerClient();

  const { data: parents, error } = await supabase
    .from('parents')
    .select('*')
    .eq('student_id', studentId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching parents for student:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: parents });
}
