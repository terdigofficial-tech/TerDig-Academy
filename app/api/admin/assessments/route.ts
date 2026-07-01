import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const { records } = body;
    
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid records format' }, { status: 400 });
    }
    
    const { error, data } = await supabase
      .from('assessments')
      .upsert(records);
    
    if (error) {
      console.error('Supabase assessments upsert error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Assessments API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
