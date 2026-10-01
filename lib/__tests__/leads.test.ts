import { describe, it, expect } from 'vitest';
import {
  isLeadStatus,
  normalizeSchoolCode,
  formatVoucherCode,
  parseVoucherSerial,
  nextVoucherSerial,
  normalizePhoneStorage,
  toWaNumber,
  summarizeLeads,
} from '../leads';

describe('status funnel leads', () => {
  it('mengenali status yang sah dan menolak yang lain', () => {
    expect(isLeadStatus('klaim_wa')).toBe(true);
    expect(isLeadStatus('daftar')).toBe(true);
    expect(isLeadStatus('lunas')).toBe(false);
    expect(isLeadStatus(null)).toBe(false);
  });
});

describe('kode sekolah & voucher', () => {
  it('normalisasi kode sekolah menjadi huruf besar 2-5 karakter', () => {
    expect(normalizeSchoolCode(' tka ')).toBe('TKA');
    expect(normalizeSchoolCode('sdn-1')).toBe('SDN1');
    expect(normalizeSchoolCode('a')).toBeNull();
    expect(normalizeSchoolCode('terlalu-panjang')).toBeNull();
    expect(normalizeSchoolCode(123)).toBeNull();
  });

  it('format kode voucher TD-[KODE]-[3 digit]', () => {
    expect(formatVoucherCode('TKA', 1)).toBe('TD-TKA-001');
    expect(formatVoucherCode('TKA', 42)).toBe('TD-TKA-042');
    expect(formatVoucherCode('SDN1', 130)).toBe('TD-SDN1-130');
  });

  it('parse nomor urut hanya untuk sekolah yang sama', () => {
    expect(parseVoucherSerial('TD-TKA-007', 'TKA')).toBe(7);
    expect(parseVoucherSerial('td-tka-012', 'TKA')).toBe(12);
    expect(parseVoucherSerial('TD-SDN1-007', 'TKA')).toBeNull();
    expect(parseVoucherSerial('bukan-voucher', 'TKA')).toBeNull();
    expect(parseVoucherSerial(null, 'TKA')).toBeNull();
  });

  it('nomor urut berikutnya = maksimum + 1, mengabaikan sekolah lain & nilai kosong', () => {
    expect(nextVoucherSerial([], 'TKA')).toBe(1);
    expect(nextVoucherSerial(['TD-TKA-001', 'TD-TKA-003', 'TD-SDN1-099', null], 'TKA')).toBe(4);
  });
});

describe('normalisasi nomor HP', () => {
  it('menyimpan dalam format +62', () => {
    expect(normalizePhoneStorage('0812-3456-7890')).toBe('+6281234567890');
    expect(normalizePhoneStorage('6281234567890')).toBe('+6281234567890');
    expect(normalizePhoneStorage('+62 812 3456 7890')).toBe('+6281234567890');
    expect(normalizePhoneStorage('')).toBeNull();
    expect(normalizePhoneStorage(null)).toBeNull();
  });

  it('tautan wa.me memakai digit 62 tanpa plus', () => {
    expect(toWaNumber('081234567890')).toBe('6281234567890');
    expect(toWaNumber('+6281234567890')).toBe('6281234567890');
    expect(toWaNumber('123')).toBeNull();
  });
});

describe('ringkasan funnel', () => {
  it('menghitung tahap & konversi dari status saat ini', () => {
    const summary = summarizeLeads([
      { status: 'amplop_dibagi' },
      { status: 'amplop_dibagi' },
      { status: 'klaim_wa' },
      { status: 'pemetaan' },
      { status: 'trial_hadir' },
      { status: 'daftar' },
      { status: 'belum_minat' },
      { status: 'hilang' },
    ]);
    expect(summary.total).toBe(8);
    expect(summary.perStatus.amplop_dibagi).toBe(2);
    expect(summary.engaged).toBe(5); // klaim + pemetaan + trial_hadir + daftar + belum_minat
    expect(summary.trialAttended).toBe(2); // trial_hadir + daftar
    expect(summary.registered).toBe(1);
    expect(summary.claimRate).toBe(62.5);
    expect(summary.trialRate).toBe(40);
    expect(summary.registrationRate).toBe(50);
  });

  it('aman untuk daftar kosong', () => {
    const summary = summarizeLeads([]);
    expect(summary.total).toBe(0);
    expect(summary.claimRate).toBe(0);
  });
});
