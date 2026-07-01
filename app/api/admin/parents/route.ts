import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: List semua parents dengan info siswa
export async function GET(req: NextRequest) {
  const supabase = createServerClient();

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('student_id');

  let query = supabase
    .from('parents')
    .select(`
      *,
      students (
        id,
        full_name,
        grade_id
      )
    `)
    .order('created_at', { ascending: false });

  // Filter by student_id jika ada
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data: parents, error } = await query;

  if (error) {
    console.error('❌ Error fetching parents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: parents });
}

// POST: Create parent baru
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerClient();

  const { 
    student_id, 
    parent_name, 
    phone_number, 
    relationship, 
    is_primary,
    receive_whatsapp 
  } = body;

  // Validasi
  if (!student_id || !parent_name || !phone_number) {
    return NextResponse.json(
      { error: 'student_id, parent_name, dan phone_number wajib diisi' },
      { status: 400 }
    );
  }

  // Format nomor WA: hapus spasi, tanda +, ganti 08 dengan 628
  const formattedPhone = phone_number
    .replace(/\s/g, '')
    .replace(/^\+/, '')
    .replace(/^08/, '628');

  // Validasi format nomor (harus 628xxx)
  if (!formattedPhone.match(/^628\d{8,12}$/)) {
    return NextResponse.json(
      { error: 'Format nomor WhatsApp tidak valid. Gunakan format: 628xxx atau 08xxx' },
      { status: 400 }
    );
  }

  // Jika is_primary = true, set semua parent lain untuk siswa ini jadi false
  if (is_primary) {
    await supabase
      .from('parents')
      .update({ is_primary: false })
      .eq('student_id', student_id);
  }

  // Insert parent baru
  const { data: parent, error } = await supabase
    .from('parents')
    .insert({
      student_id,
      parent_name,
      phone_number: formattedPhone,
      relationship: relationship || 'parent',
      is_primary: is_primary !== false,
      receive_whatsapp: receive_whatsapp !== false,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating parent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: parent }, { status: 201 });
}
