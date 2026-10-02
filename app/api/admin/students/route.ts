import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { isValidTier } from '@/lib/programs';
import { maskStudentPhone } from '@/lib/phone-mask';

export async function GET(req: NextRequest) {
  // Tutor boleh melihat daftar siswa, tetapi nomor HP wali disamarkan.
  const auth = await requireRole(req, ['admin', 'tutor']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.from('students').select('*').order('full_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((s: any) =>
    auth.user.role === 'tutor' ? maskStudentPhone(s) : s,
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServerClient();
  const body = await req.json();
  if (body.tier !== undefined && body.tier !== null && !isValidTier(body.tier)) {
    return NextResponse.json({ error: 'Tier tidak valid (reguler/premium/privat)' }, { status: 400 });
  }
  const { data, error } = await supabase.from('students').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
