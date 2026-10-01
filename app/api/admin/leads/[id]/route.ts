import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { LEAD_STATUSES, normalizePhoneStorage, normalizeSchoolCode } from '@/lib/leads';
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

const updateLeadSchema = z.object({
  child_name: z.string().trim().min(1, 'Nama anak tidak boleh kosong').optional(),
  parent_name: optionalText,
  parent_phone: optionalText,
  school_name: optionalText,
  school_code: optionalText,
  class_label: optionalText,
  voucher_code: optionalText,
  status: z.enum(LEAD_STATUSES).optional(),
  event_date: optionalText,
  trial_date: optionalText,
  notes: optionalText,
});

/** Ubah data / status lead. Hanya admin. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;

    const parsed = updateLeadSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const body = parsed.data;

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.child_name !== undefined) patch.child_name = body.child_name;
    if (body.parent_name !== undefined) patch.parent_name = body.parent_name || null;
    if (body.parent_phone !== undefined) patch.parent_phone = normalizePhoneStorage(body.parent_phone);
    if (body.school_name !== undefined) patch.school_name = body.school_name || null;
    if (body.school_code !== undefined) {
      if (!body.school_code) {
        patch.school_code = null;
      } else {
        const code = normalizeSchoolCode(body.school_code);
        if (!code) {
          return NextResponse.json(
            { error: 'Kode sekolah tidak valid (2-5 huruf/angka, mis. TKA)' },
            { status: 400 },
          );
        }
        patch.school_code = code;
      }
    }
    if (body.class_label !== undefined) patch.class_label = body.class_label || null;
    if (body.voucher_code !== undefined) {
      patch.voucher_code = body.voucher_code ? body.voucher_code.trim().toUpperCase() : null;
    }
    if (body.status !== undefined) patch.status = body.status;
    if (body.event_date !== undefined) patch.event_date = body.event_date || null;
    if (body.trial_date !== undefined) patch.trial_date = body.trial_date || null;
    if (body.notes !== undefined) patch.notes = body.notes || null;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', id)
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
    if (!data) return NextResponse.json({ error: 'Lead tidak ditemukan' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

/** Hapus lead. Ditolak bila lead sudah terkonversi menjadi siswa. Hanya admin. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;

    const supabase = createServerClient();
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, converted_student_id')
      .eq('id', id)
      .single();
    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead tidak ditemukan' }, { status: 404 });
    }
    if (lead.converted_student_id) {
      return NextResponse.json(
        { error: 'Lead ini sudah menjadi siswa — hapus dari menu Siswa bila memang perlu' },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
