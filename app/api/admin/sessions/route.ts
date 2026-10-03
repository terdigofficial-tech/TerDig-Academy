import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-middleware';
import { findSessionConflict, isValidTimeRange, formatTimeRange } from '@/lib/session-time';
import { z } from 'zod';

const LEVELS = ['pemula', 'menengah', 'lanjut'] as const;

const timeField = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'format jam harus HH:MM')
  .optional()
  .nullable();

const createSessionSchema = z.object({
  episode_id: z.string().uuid('episode_id harus berupa UUID valid'),
  target_level: z.enum(LEVELS, { error: 'target_level harus pemula, menengah, atau lanjut' }),
  title: z.string().optional().default(''),
  date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  start_time: timeField,
  end_time: timeField,
  capacity: z
    .number()
    .int('kapasitas harus bilangan bulat')
    .min(1, 'kapasitas minimal 1')
    .max(30, 'kapasitas maksimal 30')
    .optional()
    .default(8),
  room: z.string().max(60, 'nama ruangan maksimal 60 karakter').optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional().default('scheduled'),
});

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      const issues: any[] = (validation.error as any).issues || (validation.error as any).errors || [];
      const details = issues.map((e: any) => ({
        field: (e.path || []).join('.') || '',
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validasi gagal', details }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verifikasi episode_id ada di tabel episodes
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, episode_number, title')
      .eq('id', validation.data.episode_id)
      .maybeSingle();

    if (episodeError) {
      console.error('❌ Error verifying episode:', episodeError);
      return NextResponse.json({ error: episodeError.message }, { status: 500 });
    }

    if (!episode) {
      return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
    }

    // Validasi jam sesi: harus sepasang dan jam selesai setelah jam mulai
    const startTime = validation.data.start_time || null;
    const endTime = validation.data.end_time || null;
    if (!isValidTimeRange(startTime, endTime)) {
      return NextResponse.json(
        { error: 'Jam sesi tidak valid: isi jam mulai & selesai, dan jam selesai harus setelah jam mulai' },
        { status: 400 },
      );
    }

    // Cek bentrok jadwal: sesi di tanggal & ruangan yang sama tidak boleh beririsan jam.
    // Ruangan kosong dianggap "ruang default" yang sama (perilaku lama untuk 1 ruangan).
    if (startTime && endTime && validation.data.status !== 'cancelled') {
      const { data: sameDay, error: conflictQueryError } = await supabase
        .from('sessions')
        .select('id, title, date, start_time, end_time, room, status')
        .eq('date', validation.data.date)
        .not('start_time', 'is', null);
      if (conflictQueryError) {
        return NextResponse.json({ error: conflictQueryError.message }, { status: 500 });
      }
      const conflict = findSessionConflict(
        { date: validation.data.date, start_time: startTime, end_time: endTime, room: validation.data.room?.trim() || null, status: validation.data.status },
        sameDay || [],
      );
      if (conflict) {
        return NextResponse.json(
          {
            error: `Bentrok jadwal dengan sesi "${conflict.title}" (${formatTimeRange(conflict.start_time, conflict.end_time)}) di tanggal dan ruangan yang sama`,
          },
          { status: 409 },
        );
      }
    }

    // Auto-generate title jika tidak disediakan
    const title = validation.data.title || `EP-${String(episode.episode_number).padStart(3, '0')} - ${episode.title}`;

    // Auto-assign tutor_id untuk role tutor
    const insertData: any = {
      episode_id: validation.data.episode_id,
      target_level: validation.data.target_level,
      title,
      date: validation.data.date,
      start_time: startTime,
      end_time: endTime,
      capacity: validation.data.capacity,
      room: validation.data.room?.trim() || null,
      notes: validation.data.notes || null,
      status: validation.data.status,
    };

    // Jika user adalah tutor, auto-assign dirinya
    if (currentUser.role === 'tutor') {
      insertData.tutor_id = currentUser.sub;
    } else if (body.tutor_id) {
      // Admin: pakai tutor_id dari form jika ada
      insertData.tutor_id = body.tutor_id;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Session created:', data.id, '-', data.title);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/sessions:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || '';
    const episodeId = searchParams.get('episode_id') || '';

    const tutorIdFilter = searchParams.get('tutor_id') || '';

    let query = supabase
      .from('sessions')
      .select(`
        *,
        episodes!inner(episode_number, title, terdig_level),
        users!tutor_id(id, username, full_name, role)
      `, { count: 'exact' });

    // Filter by role: tutor hanya lihat session miliknya
    if (currentUser.role === 'tutor') {
      query = query.eq('tutor_id', currentUser.sub);
    }

    // Filter by tutor_id (hanya untuk admin)
    if (currentUser.role !== 'tutor' && tutorIdFilter) {
      query = query.eq('tutor_id', tutorIdFilter);
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (episodeId) {
      query = query.eq('episode_id', episodeId);
    }

    query = query
      .order('date', { ascending: false })
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/sessions:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
