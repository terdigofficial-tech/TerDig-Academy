/**
 * Masking nomor HP untuk peran non-admin (tutor).
 *
 * Kebijakan: tutor tidak boleh melihat nomor HP wali secara utuh saat
 * browsing daftar siswa. Nomor hanya tampil sebagian agar tetap bisa
 * dibedakan antar wali, mis. "+6289••••9650".
 *
 * Pengecualian: alur pengiriman laporan/rapor ke wali via WhatsApp tetap
 * memakai nomor asli karena fungsional (membuka wa.me dengan nomor tujuan).
 */

/**
 * Samarkan nomor telepon: tampilkan beberapa digit awal + "••••" + 4 digit akhir.
 * - "+62895339329650" -> "+6289••••9650"
 * - "0895339329650"   -> "0895••••9650"
 * - null/undefined/"" -> dikembalikan apa adanya
 * - digit <= 6        -> disamarkan penuh ("••••••") agar tidak bisa ditebak
 */
export function maskPhone(phone: string | null | undefined): string | null | undefined {
  if (phone === null || phone === undefined) return phone;
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 6) return '••••••';

  const headLength = trimmed.startsWith('+') ? 5 : 4;
  const head = trimmed.slice(0, headLength);
  const tail = digits.slice(-4);
  return `${head}••••${tail}`;
}

/** Samarkan parent_phone pada objek siswa untuk peran tutor. */
export function maskStudentPhone<T extends { parent_phone?: string | null }>(
  student: T,
): T {
  return { ...student, parent_phone: maskPhone(student.parent_phone ?? null) };
}
