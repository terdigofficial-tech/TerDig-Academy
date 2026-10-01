import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
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

const convertSchema = z.object({
  grade_id: z.string().uuid('Kelas (grade) wajib dipilih'),
  program_id: z.string().uuid('Program wajib dipilih'),
  current_level: z.number().int().min(0).max(6).optional(),
});

/**
 * Konversi lead menjadi siswa aktif: membuat baris students dari data lead,
 * lalu menandai lead sebagai 'daftar' dan menautkannya ke siswa baru.
 * Hanya admin.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;

    const parsed = convertSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const body = parsed.data;

    const supabase = createServerClient();
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead tidak ditemukan' }, { status: 404 });
    }
    if (lead.converted_student_id) {
      return NextResponse.json(
        { error: 'Lead ini sudah terkonversi menjadi siswa' },
        { status: 409 },
      );
    }
    if (!lead.child_name || !lead.child_name.trim()) {
      return NextResponse.json(
        { error: 'Nama anak masih kosong — lengkapi data lead dulu (edit) sebelum konversi' },
        { status: 400 },
      );
    }
    if (!lead.parent_phone) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp wali masih kosong — lengkapi data lead dulu (edit) sebelum konversi' },
        { status: 400 },
      );
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        full_name: lead.child_name,
        parent_name: lead.parent_name || null,
        parent_phone: lead.parent_phone,
        current_level: body.current_level ?? 1,
        grade_id: body.grade_id,
        program_id: body.program_id,
        status: 'active',
      })
      .select()
      .single();
    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });

    const { error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'daftar',
        converted_student_id: student.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (leadError) {
      // Siswa sudah terbuat; sampaikan agar admin bisa menandai manual bila perlu.
      return NextResponse.json(
        {
          error: `Siswa berhasil dibuat (${student.full_name}) tetapi status lead gagal diperbarui: ${leadError.message}`,
          student,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ student, lead_id: id, status: 'daftar' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
