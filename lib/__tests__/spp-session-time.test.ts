import { describe, it, expect } from 'vitest';
import {
  isValidPeriod,
  periodLabel,
  deriveInvoiceStatus,
  summarizeInvoices,
  formatRupiah,
} from '../spp';
import {
  normalizeTime,
  isValidTimeRange,
  timesOverlap,
  findSessionConflict,
} from '../session-time';

describe('spp: periode', () => {
  it('memvalidasi format YYYY-MM', () => {
    expect(isValidPeriod('2026-10')).toBe(true);
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(isValidPeriod('2026-1')).toBe(false);
    expect(isValidPeriod('Oktober 2026')).toBe(false);
  });

  it('membuat label bulan Indonesia', () => {
    expect(periodLabel('2026-10')).toBe('Oktober 2026');
    expect(periodLabel('2027-01')).toBe('Januari 2027');
  });
});

describe('spp: status tagihan', () => {
  it('diturunkan dari total terbayar', () => {
    expect(deriveInvoiceStatus(250000, 0, 'unpaid')).toBe('unpaid');
    expect(deriveInvoiceStatus(250000, 100000, 'unpaid')).toBe('partial');
    expect(deriveInvoiceStatus(250000, 250000, 'partial')).toBe('paid');
    expect(deriveInvoiceStatus(250000, 300000, 'partial')).toBe('paid');
  });

  it('cancelled bersifat lengket', () => {
    expect(deriveInvoiceStatus(250000, 250000, 'cancelled')).toBe('cancelled');
  });

  it('tagihan nol rupiah dianggap lunas', () => {
    expect(deriveInvoiceStatus(0, 0, 'unpaid')).toBe('paid');
  });
});

describe('spp: ringkasan', () => {
  it('menghitung total & sisa, mengabaikan cancelled sebagai piutang', () => {
    const s = summarizeInvoices([
      { amount: 250000, status: 'paid', paid_total: 250000 },
      { amount: 250000, status: 'partial', paid_total: 100000 },
      { amount: 250000, status: 'unpaid', paid_total: 0 },
      { amount: 250000, status: 'cancelled', paid_total: 0 },
    ]);
    expect(s.count).toBe(3);
    expect(s.paidCount).toBe(1);
    expect(s.totalBilled).toBe(750000);
    expect(s.totalPaid).toBe(350000);
    expect(s.totalOutstanding).toBe(400000);
    expect(s.cancelledCount).toBe(1);
  });

  it('format rupiah memakai pemisah ribuan titik', () => {
    expect(formatRupiah(250000)).toBe('Rp250.000');
    expect(formatRupiah(1500000)).toBe('Rp1.500.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });
});

describe('session-time', () => {
  it('normalisasi HH:MM:SS menjadi HH:MM', () => {
    expect(normalizeTime('14:00:00')).toBe('14:00');
    expect(normalizeTime('14:00')).toBe('14:00');
    expect(normalizeTime(null)).toBeNull();
    expect(normalizeTime('')).toBeNull();
  });

  it('validasi rentang jam harus sepasang dan berurutan', () => {
    expect(isValidTimeRange(null, null)).toBe(true);
    expect(isValidTimeRange('14:00', '15:30')).toBe(true);
    expect(isValidTimeRange('15:30', '14:00')).toBe(false);
    expect(isValidTimeRange('14:00', null)).toBe(false);
  });

  it('irisan jam: sesi bersebelahan tidak bentrok', () => {
    expect(timesOverlap('14:00', '15:00', '15:00', '16:00')).toBe(false);
    expect(timesOverlap('14:00', '15:30', '15:00', '16:00')).toBe(true);
    expect(timesOverlap('14:00', '16:00', '14:30', '15:00')).toBe(true);
  });

  it('deteksi bentrok: tanggal sama + jam beririsan + bukan cancelled', () => {
    const existing = [
      { id: 'a', title: 'Sesi Pagi', date: '2026-10-05', start_time: '14:00', end_time: '15:30', status: 'scheduled' },
      { id: 'b', title: 'Sesi Batal', date: '2026-10-05', start_time: '14:00', end_time: '15:30', status: 'cancelled' },
      { id: 'c', title: 'Sesi Tanpa Jam', date: '2026-10-05', start_time: null, end_time: null, status: 'scheduled' },
    ];
    const bentrok = findSessionConflict(
      { date: '2026-10-05', start_time: '15:00', end_time: '16:00', status: 'scheduled' },
      existing,
    );
    expect(bentrok?.id).toBe('a');

    const bedaTanggal = findSessionConflict(
      { date: '2026-10-06', start_time: '15:00', end_time: '16:00', status: 'scheduled' },
      existing,
    );
    expect(bedaTanggal).toBeNull();

    const dirinyaSendiri = findSessionConflict(
      { id: 'a', date: '2026-10-05', start_time: '14:00', end_time: '15:30', status: 'scheduled' },
      existing,
    );
    expect(dirinyaSendiri).toBeNull();
  });
});
