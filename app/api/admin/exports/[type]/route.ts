import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { buildExcelBuffer, excelFileName, excelHeaders } from '@/lib/excel';
import { INVOICE_STATUS_LABEL } from '@/lib/spp';

const VALID_TYPES = ['students', 'invoices', 'attendance'] as const;
type ExportType = (typeof VALID_TYPES)[number];

/**
 * GET /api/admin/exports/[type]
 * Mengunduh data sebagai file .xlsx — khusus admin.
 * - students: daftar siswa (+kelas, program, tier, wali)
 * - invoices?period=YYYY-MM: tagihan SPP (+total bayar & sisa)
 * - attendance?from=YYYY-MM-DD&to=YYYY-MM-DD: kehadiran per sesi
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { type } = await params;
  if (!(VALID_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `Tipe ekspor tidak dikenal: ${type}` }, { status: 404 });
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);

  try {
    if (type === 'students') return await exportStudents(supabase);
    if (type === 'invoices') return await exportInvoices(supabase, searchParams.get('period') || '');
    return await exportAttendance(
      supabase,
      searchParams.get('from') || '',
      searchParams.get('to') || '',
    );
  } catch (err: any) {
    console.error('❌ Export error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function fileResponse(base: string, rows: Record<string, any>[], sheetName: string) {
  const buf = buildExcelBuffer([{ name: sheetName, rows }]);
  return new NextResponse(buf as unknown as BodyInit, { headers: excelHeaders(excelFileName(base)) });
}

async function exportStudents(supabase: any) {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, status, tier, parent_name, parent_phone, enrolled_at, grades(name), programs(name)')
    .order('full_name');
  if (error) throw error;

  const rows = (students || []).map((s: any) => ({
    'Nama Siswa': s.full_name,
    'Kelas': s.grades?.name || '-',
    'Program': s.programs?.name || '-',
    'Tier': s.tier ? String(s.tier).charAt(0).toUpperCase() + String(s.tier).slice(1) : '-',
    'Status': s.status === 'active' ? 'Aktif' : 'Nonaktif',
    'Nama Wali': s.parent_name || '-',
    'No. HP Wali': s.parent_phone || '-',
    'Tanggal Masuk': s.enrolled_at ? String(s.enrolled_at).slice(0, 10) : '-',
  }));
  return fileResponse('data-siswa', rows, 'Siswa');
}

async function exportInvoices(supabase: any, period: string) {
  let query = supabase
    .from('invoices')
    .select('period, amount, status, notes, created_at, students(full_name), payments(amount)')
    .order('period', { ascending: false })
    .order('created_at', { ascending: false });
  if (period) query = query.eq('period', period);

  const { data: invoices, error } = await query;
  if (error) throw error;

  const rows = (invoices || []).map((inv: any) => {
    const paid = (inv.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const amount = Number(inv.amount) || 0;
    return {
      'Periode': inv.period,
      'Nama Siswa': inv.students?.full_name || '-',
      'Jumlah Tagihan (Rp)': amount,
      'Total Bayar (Rp)': paid,
      'Sisa (Rp)': Math.max(0, amount - paid),
      'Status': (INVOICE_STATUS_LABEL as Record<string, string>)[inv.status] || inv.status,
      'Catatan': inv.notes || '-',
    };
  });
  return fileResponse(period ? `tagihan-${period}` : 'tagihan-semua', rows, 'Tagihan');
}

async function exportAttendance(supabase: any, from: string, to: string) {
  // Default: 30 hari terakhir
  const end = to || new Date().toISOString().split('T')[0];
  const startDate = new Date(end);
  startDate.setDate(startDate.getDate() - 30);
  const start = from || startDate.toISOString().split('T')[0];

  const { data: records, error } = await supabase
    .from('attendance')
    .select('date, status, notes, sessions(title, room), students(full_name)')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });
  if (error) throw error;

  const STATUS_LABEL: Record<string, string> = {
    present: 'Hadir', absent: 'Tidak Hadir', late: 'Terlambat', excused: 'Izin', sick: 'Sakit',
  };
  const rows = (records || []).map((r: any) => ({
    'Tanggal': r.date,
    'Sesi': r.sessions?.title || '-',
    'Ruangan': r.sessions?.room || '-',
    'Nama Siswa': r.students?.full_name || '-',
    'Kehadiran': STATUS_LABEL[r.status] || r.status,
    'Catatan': r.notes || '-',
  }));
  return fileResponse(`kehadiran-${start}_${end}`, rows, 'Kehadiran');
}
