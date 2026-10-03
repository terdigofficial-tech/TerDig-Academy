import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { isValidTimeRange } from '@/lib/session-time';
import { MAX_GENERATE_WEEKS, weeksBetween } from '@/lib/schedule';
import { z } from 'zod';

const LEVELS = ['pemula', 'menengah', 'lanjut'] as const;

const scheduleSchema = z.object({
  title: z.string().min(1, 'judul wajib diisi').max(120),
  target_level: z.enum(LEVELS, { error: 'target_level harus pemula, menengah, atau lanjut' }),
  episode_id: z.string().uuid('episode awal wajib dipilih'),
  tutor_id: z.string().uuid('tutor_id harus UUID valid').optional().nullable(),
  days_of_week: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'pilih minimal 1 hari')
    .max(7)
    .refine((a) => new Set(a).size === a.length, 'hari tidak boleh duplikat'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'format jam harus HH:MM').optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'format jam harus HH:MM').optional().nullable(),
  room: z.string().max(60).optional().nullable(),
  capacity: z.number().int().min(1).max(30).optional().default(8),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format tanggal harus YYYY-MM-DD'),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format tanggal harus YYYY-MM-DD').optional().nullable(),
  is_active: z.boolean().optional().default(true),
}).refine(
  (d) => isValidTimeRange(d.start_time || null, d.end_time || null),
  { message: 'jam selesai harus setelah jam mulai (isi keduanya)', path: ['end_time'] },
).refine(
  (d) => !d.valid_until || d.valid_until >= d.valid_from,
  { message: 'tanggal selesai harus >= tanggal mulai', path: ['valid_until'] },
).refine(
  (d) => weeksBetween(d.valid_from, d.valid_until || d.valid_from) <= MAX_GENERATE_WEEKS,
  { message: `rentang maksimal ${MAX_GENERATE_WEEKS} minggu`, path: ['valid_until'] },
);

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*, users!tutor_id(id, username, full_name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const body = await req.json();
  const validation = scheduleSchema.safeParse(body);
  if (!validation.success) {
    const issues: any[] = (validation.error as any).issues || [];
    return NextResponse.json(
      { error: 'Validasi gagal', details: issues.map((e: any) => ({ field: (e.path || []).join('.'), message: e.message })) },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Verifikasi episode ada
  const { data: episode } = await supabase
    .from('episodes')
    .select('id')
    .eq('id', validation.data.episode_id)
    .maybeSingle();
  if (!episode) {
    return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('recurring_schedules')
    .insert({
      title: validation.data.title,
      target_level: validation.data.target_level,
      episode_id: validation.data.episode_id,
      tutor_id: validation.data.tutor_id || null,
      days_of_week: validation.data.days_of_week,
      start_time: validation.data.start_time || null,
      end_time: validation.data.end_time || null,
      room: validation.data.room?.trim() || null,
      capacity: validation.data.capacity,
      valid_from: validation.data.valid_from,
      valid_until: validation.data.valid_until || null,
      is_active: validation.data.is_active,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
