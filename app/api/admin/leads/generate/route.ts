import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { formatVoucherCode, nextVoucherSerial, normalizeSchoolCode } from '@/lib/leads';
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

const generateSchema = z.object({
  school_name: z.string().trim().min(1, 'Nama sekolah wajib diisi'),
  school_code: z.string().trim().min(1, 'Kode sekolah wajib diisi'),
  count: z.number().int('Jumlah harus bilangan bulat').min(1, 'Minimal 1 amplop').max(500, 'Maksimal 500 amplop sekali generate'),
  event_date: z.string().trim().optional().nullable(),
  class_label: z.string().trim().optional().nullable(),
});

/**
 * Generate lead massal untuk persiapan amplop Smart Session satu sekolah:
 * setiap amplop = 1 lead status amplop_dibagi dengan kode voucher berurutan
 * TD-[KODE]-[NNN], melanjutkan nomor terakhir sekolah itu. Nama anak masih
 * kosong — diisi saat orang tua klaim via WhatsApp. Hanya admin.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const parsed = generateSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const body = parsed.data;

    const schoolCode = normalizeSchoolCode(body.school_code);
    if (!schoolCode) {
      return NextResponse.json(
        { error: 'Kode sekolah tidak valid (2-5 huruf/angka, mis. TKA)' },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const { data: existing, error: fetchError } = await supabase
      .from('leads')
      .select('voucher_code')
      .eq('school_code', schoolCode)
      .not('voucher_code', 'is', null);
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    const startSerial = nextVoucherSerial((existing || []).map((r) => r.voucher_code), schoolCode);
    const rows = Array.from({ length: body.count }, (_, i) => ({
      child_name: '',
      school_name: body.school_name,
      school_code: schoolCode,
      class_label: body.class_label || null,
      voucher_code: formatVoucherCode(schoolCode, startSerial + i),
      status: 'amplop_dibagi' as const,
      event_date: body.event_date || null,
      source: 'smart_session',
      created_by: auth.user.sub,
    }));

    const { data, error } = await supabase.from('leads').insert(rows).select('id, voucher_code');
    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json(
          { error: 'Ada kode voucher yang bentrok — muat ulang halaman lalu coba lagi' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      created: data?.length || 0,
      first_code: rows[0].voucher_code,
      last_code: rows[rows.length - 1].voucher_code,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
