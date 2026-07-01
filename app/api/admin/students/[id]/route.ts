import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching student:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    console.log('✓ Student fetched:', id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in GET student:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid. Gunakan \'active\' atau \'inactive\'' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('students')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error toggling student status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Student status toggled:', id, '->', status);
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('❌ Error in PATCH student:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { id } = await params;
    const { full_name, parent_name, parent_phone, current_level, grade_id, program_id, status } = await req.json();

    // Validasi
    if (!full_name || !parent_phone) {
      return NextResponse.json({ error: 'Nama dan telepon wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    const updateData: any = {
      full_name,
      parent_name,
      parent_phone,
      current_level,
      status
    };

    // Tambahkan grade_id dan program_id jika ada
    if (grade_id) updateData.grade_id = grade_id;
    if (program_id) updateData.program_id = program_id;

    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating student:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Student updated:', id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in PUT student:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
