import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import {
  LEAD_STATUSES,
  isLeadStatus,
  normalizePhoneStorage,
  normalizeSchoolCode,
  summarizeLeads,
} from '@/lib/leads';
import { z } from 'zod';

function validationError(error: z.ZodError) {
  const issues: any[] = (error as any).issues || (error as any).errors || [];
  return NextResponse.json(
    {
      error: 'Validasi gagal',
      details: issues.map((e: any) => ({
        field: (e.path || []).join('.') || '',
        message: e.message,
      })),
    },
    { status: 400 },
  );
}

const optionalText = z.string().trim().optional().nullable();

const createLeadSchema = z.object({
  child_name: z.string().trim().min(1, 'Nama anak wajib diisi'),
  parent_name: optionalText,
  parent_phone: optionalText,
  school_name: optionalText,
  school_code: optionalText,
  class_label: optionalText,
  voucher_code: optionalText,
  status: z.enum(LEAD_STATUSES).optional(),
  event_date: optionalText,
  trial_date: optionalText,
  source: optionalText,
  notes: optionalText,
});

/** Daftar leads + ringkasan funnel. Hanya admin. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const school = (searchParams.get('school') || '').toUpperCase();
    const search = (searchParams.get('search') || '').toLowerCase();

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const all = data || [];

    // Daftar sekolah untuk filter (dari data yang ada)
    const schoolMap = new Map<string, string>();
    for (const lead of all) {
      if (lead.school_code && !schoolMap.has(lead.school_code)) {
        schoolMap.set(lead.school_code, lead.school_name || lead.school_code);
      }
    }
    const schools = Array.from(schoolMap.entries()).map(([code, name]) => ({ code, name }));

    // Ringkasan funnel dihitung dari cakupan sekolah terpilih (atau semua)
    const summaryBase = school ? all.filter((l) => l.school_code === school) : all;
    const summary = summarizeLeads(summaryBase);

    let leads = summaryBase;
    if (status && isLeadStatus(status)) {
      leads = leads.filter((l) => l.status === status);
    }
    if (search) {
      leads = leads.filter((l) =>
        [l.child_name, l.parent_name, l.voucher_code]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(search)),
      );
    }

    return NextResponse.json({ leads, summary, schools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

/** Buat lead manual (mis. orang tua baru klaim via WA). Hanya admin. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const parsed = createLeadSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const body = parsed.data;

    let schoolCode: string | null = null;
    if (body.school_code) {
      schoolCode = normalizeSchoolCode(body.school_code);
      if (!schoolCode) {
        return NextResponse.json(
          { error: 'Kode sekolah tidak valid (2-5 huruf/angka, mis. TKA)' },
          { status: 400 },
        );
      }
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('leads')
      .insert({
        child_name: body.child_name,
        parent_name: body.parent_name || null,
        parent_phone: normalizePhoneStorage(body.parent_phone),
        school_name: body.school_name || null,
        school_code: schoolCode,
        class_label: body.class_label || null,
        voucher_code: body.voucher_code ? body.voucher_code.trim().toUpperCase() : null,
        status: body.status || 'klaim_wa',
        event_date: body.event_date || null,
        trial_date: body.trial_date || null,
        source: body.source || 'smart_session',
        notes: body.notes || null,
        created_by: auth.user.sub,
      })
      .select()
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json(
          { error: `Kode voucher ${body.voucher_code} sudah dipakai lead lain` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
