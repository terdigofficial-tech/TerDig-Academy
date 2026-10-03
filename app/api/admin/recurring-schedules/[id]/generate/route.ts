import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { expandWeeklyDates, MAX_GENERATE_WEEKS, weeksBetween } from '@/lib/schedule';
import { findSessionConflict } from '@/lib/session-time';

/**
 * POST /api/admin/recurring-schedules/[id]/generate
 * Mengembangkan pola jadwal rutin menjadi baris sesi nyata.
 * Idempoten: tanggal yang sudah punya sesi dari jadwal ini dilewati.
 * Sesi yang akan bentrok ruangan dilewati dan dilaporkan.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: sched, error: schedError } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (schedError || !sched) {
    return NextResponse.json({ error: 'Jadwal rutin tidak ditemukan' }, { status: 404 });
  }
  if (!sched.is_active) {
    return NextResponse.json({ error: 'Jadwal rutin nonaktif — aktifkan dulu sebelum generate' }, { status: 400 });
  }

  const until = sched.valid_until || sched.valid_from;
  if (weeksBetween(sched.valid_from, until) > MAX_GENERATE_WEEKS) {
    return NextResponse.json(
      { error: `Rentang melebihi ${MAX_GENERATE_WEEKS} minggu — persempit valid_from/valid_until` },
      { status: 400 },
    );
  }

  const dates = expandWeeklyDates(sched.days_of_week, sched.valid_from, until);
  if (dates.length === 0) {
    return NextResponse.json({ created: 0, skipped_existing: 0, skipped_conflict: [], message: 'Tidak ada tanggal yang cocok' });
  }

  // Tanggal yang sudah punya sesi dari jadwal ini (idempoten)
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, date')
    .eq('recurring_schedule_id', id);
  const existingDates = new Set((existing || []).map((s: any) => s.date));
  const todoDates = dates.filter((d) => !existingDates.has(d));

  // Semua sesi non-cancel untuk cek bentrok ruangan
  const { data: daySessions } = await supabase
    .from('sessions')
    .select('id, date, start_time, end_time, room, status, title')
    .in('date', todoDates)
    .neq('status', 'cancelled');

  const rows: any[] = [];
  const skippedConflict: { date: string; conflict_with: string }[] = [];
  for (const date of todoDates) {
    const candidate = {
      date,
      start_time: sched.start_time,
      end_time: sched.end_time,
      room: sched.room,
      status: 'scheduled',
    };
    const conflict = findSessionConflict(
      candidate,
      (daySessions || []).filter((s: any) => s.date === date),
    );
    if (conflict) {
      skippedConflict.push({ date, conflict_with: String(conflict.title || conflict.id || '') });
      continue;
    }
    rows.push({
      recurring_schedule_id: id,
      episode_id: sched.episode_id,
      title: `${sched.title} — ${date}`,
      date,
      start_time: sched.start_time,
      end_time: sched.end_time,
      room: sched.room,
      capacity: sched.capacity,
      target_level: sched.target_level,
      tutor_id: sched.tutor_id,
      status: 'scheduled',
    });
  }

  let created = 0;
  if (rows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('sessions')
      .insert(rows)
      .select('id');
    if (insertError) {
      return NextResponse.json(
        { error: `Gagal membuat sesi: ${insertError.message}` },
        { status: 500 },
      );
    }
    created = (inserted || []).length;
  }

  return NextResponse.json({
    created,
    skipped_existing: existingDates.size > 0 ? dates.length - todoDates.length : 0,
    skipped_conflict: skippedConflict,
    total_dates: dates.length,
  });
}
