/**
 * Ekspor Excel (format .xlsx) untuk arsip & laporan manual.
 * Dipakai oleh API /api/admin/exports/[type] — khusus admin.
 */
import * as XLSX from 'xlsx';

export interface ExcelSheet {
  /** Nama sheet (maks 31 karakter). */
  name: string;
  /** Baris data sebagai objek; kunci = header kolom bahasa Indonesia. */
  rows: Record<string, string | number | null | undefined>[];
}

/** Susun workbook dari beberapa sheet menjadi Buffer .xlsx. */
export function buildExcelBuffer(sheets: ExcelSheet[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    // Lebar kolom otomatis sederhana berdasarkan header
    const headers = sheet.rows.length > 0 ? Object.keys(sheet.rows[0]) : [];
    ws['!cols'] = headers.map((h) => ({ wch: Math.min(40, Math.max(h.length + 2, 14)) }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Nama file aman: "siswa-20261003.xlsx". */
export function excelFileName(base: string, date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
  return `${base}-${stamp}.xlsx`;
}

/** Header respons untuk unduhan file Excel. */
export function excelHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
}
