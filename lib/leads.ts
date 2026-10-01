// Logika murni modul Leads & Trial (funnel TerDig Smart Session).
// Status funnel menyamai TRACKER_FUNNEL.xlsx agar transisi dari Excel mulus:
// AMPLOP DIBAGI -> KLAIM WA -> PEMETAAN -> TRIAL TERJADWAL -> TRIAL HADIR -> DAFTAR,
// dengan dua status keluar: BELUM MINAT dan HILANG (tidak ada kabar).

export const LEAD_STATUSES = [
  'amplop_dibagi',
  'klaim_wa',
  'pemetaan',
  'trial_terjadwal',
  'trial_hadir',
  'daftar',
  'belum_minat',
  'hilang',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  amplop_dibagi: 'Amplop Dibagi',
  klaim_wa: 'Klaim WA',
  pemetaan: 'Pemetaan',
  trial_terjadwal: 'Trial Terjadwal',
  trial_hadir: 'Trial Hadir',
  daftar: 'Daftar',
  belum_minat: 'Belum Minat',
  hilang: 'Hilang',
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}

// Kode sekolah untuk voucher: 2-5 karakter huruf/angka, selalu huruf besar.
// Contoh panduan paket cetak: TK Aisyiyah -> "TKA".
export function normalizeSchoolCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 2 || code.length > 5) return null;
  return code;
}

// Format resmi voucher TerDig: TD-[kode sekolah]-[nomor urut 3 digit], mis. TD-TKA-001.
export function formatVoucherCode(schoolCode: string, serial: number): string {
  return `TD-${schoolCode}-${String(serial).padStart(3, '0')}`;
}

export function parseVoucherSerial(voucherCode: unknown, schoolCode: string): number | null {
  if (typeof voucherCode !== 'string') return null;
  const match = voucherCode.trim().toUpperCase().match(new RegExp(`^TD-${schoolCode}-(\\d+)$`));
  if (!match) return null;
  const serial = Number.parseInt(match[1], 10);
  return Number.isFinite(serial) ? serial : null;
}

// Nomor urut voucher berikutnya untuk satu sekolah, dari daftar kode yang sudah ada.
export function nextVoucherSerial(existingCodes: Array<string | null | undefined>, schoolCode: string): number {
  let max = 0;
  for (const code of existingCodes) {
    const serial = parseVoucherSerial(code, schoolCode);
    if (serial !== null && serial > max) max = serial;
  }
  return max + 1;
}

// Normalisasi nomor HP Indonesia untuk disimpan (samakan dengan format siswa: +62...).
export function normalizePhoneStorage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+62')) return digits;
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `+62${digits}`;
  return trimmed;
}

// Nomor untuk tautan wa.me (tanpa "+", awalan 62).
export function toWaNumber(raw: unknown): string | null {
  const stored = normalizePhoneStorage(raw);
  if (!stored) return null;
  const digits = stored.replace(/\D/g, '');
  return digits.length >= 9 ? digits : null;
}

export interface LeadSummary {
  total: number;
  perStatus: Record<LeadStatus, number>;
  /** Pernah merespons (klaim WA atau tahap sesudahnya, termasuk yang akhirnya belum minat). */
  engaged: number;
  /** Sudah hadir trial (status trial_hadir atau daftar). */
  trialAttended: number;
  /** Sudah menjadi siswa (status daftar). */
  registered: number;
  /** Persentase engaged dari total peserta. */
  claimRate: number;
  /** Persentase trial hadir dari yang engaged. */
  trialRate: number;
  /** Persentase daftar dari yang hadir trial. */
  registrationRate: number;
}

const ENGAGED_STATUSES: LeadStatus[] = ['klaim_wa', 'pemetaan', 'trial_terjadwal', 'trial_hadir', 'daftar', 'belum_minat'];
const TRIAL_ATTENDED_STATUSES: LeadStatus[] = ['trial_hadir', 'daftar'];

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function summarizeLeads(leads: Array<{ status: string }>): LeadSummary {
  const perStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const lead of leads) {
    if (isLeadStatus(lead.status)) perStatus[lead.status] += 1;
  }
  const total = leads.length;
  const engaged = ENGAGED_STATUSES.reduce((sum, s) => sum + perStatus[s], 0);
  const trialAttended = TRIAL_ATTENDED_STATUSES.reduce((sum, s) => sum + perStatus[s], 0);
  const registered = perStatus.daftar;
  return {
    total,
    perStatus,
    engaged,
    trialAttended,
    registered,
    claimRate: pct(engaged, total),
    trialRate: pct(trialAttended, engaged),
    registrationRate: pct(registered, trialAttended),
  };
}
