import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildExcelBuffer, excelFileName, excelHeaders } from '../excel';

describe('buildExcelBuffer', () => {
  it('menghasilkan xlsx valid yang bisa dibaca kembali', () => {
    const buf = buildExcelBuffer([
      {
        name: 'Siswa',
        rows: [
          { 'Nama Siswa': 'Andi', 'Kelas': 'TK B', 'Tier': 'Reguler' },
          { 'Nama Siswa': 'Budi', 'Kelas': 'Kelas 1 SD', 'Tier': 'Premium' },
        ],
      },
    ]);
    expect(buf.length).toBeGreaterThan(0);

    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Siswa']);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Siswa']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ 'Nama Siswa': 'Andi', 'Tier': 'Reguler' });
  });

  it('mendukung banyak sheet dan nama sheet panjang dipotong', () => {
    const buf = buildExcelBuffer([
      { name: 'Satu', rows: [{ A: 1 }] },
      { name: 'Nama sheet yang sangat panjang melebihi 31 karakter', rows: [{ B: 2 }] },
    ]);
    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toHaveLength(2);
    expect(wb.SheetNames[1].length).toBeLessThanOrEqual(31);
  });

  it('sheet kosong tetap valid', () => {
    const buf = buildExcelBuffer([{ name: 'Kosong', rows: [] }]);
    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Kosong']);
  });
});

describe('excelFileName & excelHeaders', () => {
  it('format nama file benar', () => {
    expect(excelFileName('data-siswa', new Date(2026, 9, 3))).toBe('data-siswa-20261003.xlsx');
  });

  it('header unduhan benar', () => {
    const h = excelHeaders('data-siswa-20261003.xlsx');
    expect(h['Content-Type']).toContain('spreadsheetml.sheet');
    expect(h['Content-Disposition']).toContain('attachment');
    expect(h['Content-Disposition']).toContain('data-siswa-20261003.xlsx');
  });
});
