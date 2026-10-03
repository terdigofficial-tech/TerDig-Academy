import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { isValidTimeRange } from '@/lib/session-time';
import { MAX_GENERATE_WEEKS, weeksBetween } from '@/lib/schedule';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  target_level: z.enum(['pemula', 'menengah', 'lanjut']).optional(),
  episode_id: z.string().uuid('episode awal wajib dipilih').optional(),
  tutor_id: z.string().uuid().optional().nullable(),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7)
    .refine((a) => new Set(a).size === a.length, 'hari tidak boleh duplikat').optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  room: z.string().max(60).optional().nullable(),
  capacity: z.number().int().min(1).max(30).optional(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*, users!tutor_id(id, username, full_name), episodes!episode_id(id, episode_number, title)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Jadwal rutin tidak ditemukan' }, { status: 404 });

  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('recurring_schedule_id', id);

  return NextResponse.json({ data: { ...data, generated_count: count || 0 } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const { id } = await params;
  const body = await req.json();
  const validation = updateSchema.safeParse(body);
  if (!validation.success) {
    const issues: any[] = (validation.error as any).issues || [];
    return NextResponse.json(
      { error: 'Validasi gagal', details: issues.map((e: any) => ({ field: (e.path || []).join('.'), message: e.message })) },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data: current } = await supabase
    .from('recurring_schedules')
    .select('start_time, end_time, valid_from, valid_until')
    .eq('id', id)
    .single();
  if (!current) return NextResponse.json({ error: 'Jadwal rutin tidak ditemukan' }, { status: 404 });

  const merged = { ...current, ...validation.data };
  if (!isValidTimeRange(merged.start_time || null, merged.end_time || null)) {
    return NextResponse.json({ error: 'Jam tidak valid: jam selesai harus setelah jam mulai' }, { status: 400 });
  }
  if (merged.valid_until && merged.valid_until < merged.valid_from) {
    return NextResponse.json({ error: 'Tanggal selesai harus >= tanggal mulai' }, { status: 400 });
  }
  if (weeksBetween(merged.valid_from, merged.valid_until || merged.valid_from) > MAX_GENERATE_WEEKS) {
    return NextResponse.json({ error: `Rentang maksimal ${MAX_GENERATE_WEEKS} minggu` }, { status: 400 });
  }

  const patch: any = { ...validation.data, updated_at: new Date().toISOString() };
  if (patch.room !== undefined) patch.room = patch.room?.trim() || null;

  const { data, error } = await supabase
    .from('recurring_schedules')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const { id } = await params;
  const supabase = createServerClient();

  // Sesi yang sudah ter-generate tetap ada (FK SET NULL), hanya polanya yang dihapus
  const { error } = await supabase.from('recurring_schedules').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
