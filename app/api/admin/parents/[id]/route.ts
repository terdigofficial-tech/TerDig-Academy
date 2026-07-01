import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: Detail parent by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: parent, error } = await supabase
    .from('parents')
    .select(`
      *,
      students (
        id,
        full_name,
        grade_id
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Error fetching parent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!parent) {
    return NextResponse.json({ error: 'Parent tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ data: parent });
}

// PUT: Update parent
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const { 
    parent_name, 
    phone_number, 
    relationship, 
    is_primary,
    receive_whatsapp 
  } = body;

  // Format nomor WA jika ada perubahan
  let formattedPhone = phone_number;
  if (phone_number) {
    formattedPhone = phone_number
      .replace(/\s/g, '')
      .replace(/^\+/, '')
      .replace(/^08/, '628');

    // Validasi format
    if (!formattedPhone.match(/^628\d{8,12}$/)) {
      return NextResponse.json(
        { error: 'Format nomor WhatsApp tidak valid' },
        { status: 400 }
      );
    }
  }

  // Jika is_primary = true, set semua parent lain untuk siswa ini jadi false
  if (is_primary) {
    const { data: currentParent } = await supabase
      .from('parents')
      .select('student_id')
      .eq('id', id)
      .single();

    if (currentParent) {
      await supabase
        .from('parents')
        .update({ is_primary: false })
        .eq('student_id', currentParent.student_id)
        .neq('id', id);
    }
  }

  // Update parent
  const updateData: Record<string, any> = {};
  if (parent_name) updateData.parent_name = parent_name;
  if (formattedPhone) updateData.phone_number = formattedPhone;
  if (relationship) updateData.relationship = relationship;
  if (is_primary !== undefined) updateData.is_primary = is_primary;
  if (receive_whatsapp !== undefined) updateData.receive_whatsapp = receive_whatsapp;

  const { data: parent, error } = await supabase
    .from('parents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating parent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: parent });
}

// DELETE: Hapus parent
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('parents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Error deleting parent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
