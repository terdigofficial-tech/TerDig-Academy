import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .order('level');

    if (error) {
      console.error('❌ Error fetching grades:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Grades fetched:', data?.length || 0);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in grades API:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, level } = await req.json();

    if (!name || level === undefined) {
      return NextResponse.json({ error: 'Nama dan level wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('grades')
      .insert({ name, level })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating grade:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✓ Grade created:', data.id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in POST grades:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

