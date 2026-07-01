import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { reportId } = await req.json();
    if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 });

    const supabase = createServerClient();
    // Simulasi kirim WA (nanti diisi integrasi nyata)
    const { error } = await supabase.from('parent_reports').update({ wa_status: 'sent' }).eq('id', reportId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'WA terkirim (simulasi)' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
