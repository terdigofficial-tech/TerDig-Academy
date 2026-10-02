import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { personalize, filterAudience, validateBroadcast } from '@/lib/broadcast';

/** GET /api/admin/broadcasts — daftar broadcast + progres terkirim. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const supabase = createServerClient();
    const { data: broadcasts, error } = await supabase
      .from('broadcasts')
      .select('id, title, message_template, audience, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: recipients, error: rErr } = await supabase
      .from('broadcast_recipients')
      .select('broadcast_id, status');
    if (rErr) throw rErr;

    const counts = new Map<string, { total: number; sent: number }>();
    for (const r of recipients || []) {
      const c = counts.get(r.broadcast_id) || { total: 0, sent: 0 };
      c.total += 1;
      if (r.status === 'sent') c.sent += 1;
      counts.set(r.broadcast_id, c);
    }

    return NextResponse.json(
      (broadcasts || []).map((b: any) => ({
        ...b,
        ...(counts.get(b.id) || { total: 0, sent: 0 }),
      })),
    );
  } catch (err: any) {
    console.error('❌ Error in GET broadcasts:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/broadcasts — buat broadcast + generate penerima.
 * Body: { title, message, program_ids?: string[], grade_ids?: string[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { title, message, program_ids, grade_ids } = await req.json();
    const errors = validateBroadcast({ title, message });
    if (errors.length > 0) return NextResponse.json({ error: errors[0] }, { status: 400 });

    const audience = {
      program_ids: Array.isArray(program_ids) ? program_ids : [],
      grade_ids: Array.isArray(grade_ids) ? grade_ids : [],
    };

    const supabase = createServerClient();
    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('id, full_name, parent_name, parent_phone, program_id, grade_id')
      .eq('status', 'active')
      .order('full_name');
    if (sErr) throw sErr;

    const targets = filterAudience(students || [], audience);
    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada siswa aktif yang cocok dengan filter penerima' },
        { status: 400 },
      );
    }

    const { data: broadcast, error: bErr } = await supabase
      .from('broadcasts')
      .insert({
        title: title.trim(),
        message_template: message.trim(),
        audience,
        created_by: (auth as any).user?.sub || null,
      })
      .select()
      .single();
    if (bErr) throw bErr;

    const rows = targets.map((s: any) => ({
      broadcast_id: broadcast.id,
      student_id: s.id,
      parent_name: s.parent_name || '',
      parent_phone: s.parent_phone || '',
      personalized_text: personalize(message.trim(), {
        child_name: s.full_name || '',
        parent_name: s.parent_name || '',
      }),
    }));
    const { error: rErr } = await supabase.from('broadcast_recipients').insert(rows);
    if (rErr) throw rErr;

    return NextResponse.json({ ...broadcast, total: rows.length, sent: 0 });
  } catch (err: any) {
    console.error('❌ Error in POST broadcasts:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
