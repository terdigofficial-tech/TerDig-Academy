import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) {
      console.error('❌ Error fetching settings:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Konversi array [{key, value}] → object {key: value}
    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error('❌ Error in GET settings:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key dan value wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' });

    if (error) {
      console.error('❌ Error saving setting:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✓ Setting saved: ${key} = ${value}`);
    return NextResponse.json({ success: true, key, value });
  } catch (err: any) {
    console.error('❌ Error in PUT settings:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
