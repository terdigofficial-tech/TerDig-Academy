import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, level } = await req.json();

    if (!name || level === undefined) {
      return NextResponse.json({ error: 'Nama dan level wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('grades')
      .update({ name, level })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating grade:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Grade updated:', id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in PUT grades:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = createServerClient();
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting grade:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Grade deleted:', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Error in DELETE grades:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
