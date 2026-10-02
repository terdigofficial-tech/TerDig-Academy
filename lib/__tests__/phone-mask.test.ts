import { describe, it, expect } from 'vitest';
import { maskPhone, maskStudentPhone } from '../phone-mask';

describe('maskPhone', () => {
  it('mengembalikan null/undefined/empty apa adanya', () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeUndefined();
    expect(maskPhone('')).toBe('');
    expect(maskPhone('   ')).toBe(''); // whitespace-only -> string kosong
  });

  it('menyamarkan format +62', () => {
    expect(maskPhone('+62895339329650')).toBe('+6289••••9650');
  });

  it('menyamarkan format 08 lokal', () => {
    expect(maskPhone('0895339329650')).toBe('0895••••9650');
  });

  it('mentolerir spasi dan tanda hubung', () => {
    expect(maskPhone('+62 895-3393-29650')).toBe('+62 8••••9650');
  });

  it('menyamarkan penuh nomor yang terlalu pendek (<=6 digit)', () => {
    expect(maskPhone('12345')).toBe('••••••');
    expect(maskPhone('+62123')).toBe('••••••');
  });

  it('4 digit terakhir selalu terlihat untuk pembeda', () => {
    const masked = maskPhone('+6281111112222')!;
    expect(masked.endsWith('2222')).toBe(true);
    expect(masked).not.toContain('8111111');
  });
});

describe('maskStudentPhone', () => {
  it('menyamarkan parent_phone tanpa mengubah field lain', () => {
    const student = { id: 's1', full_name: 'Budi', parent_phone: '+62895339329650' };
    const masked = maskStudentPhone(student);
    expect(masked.parent_phone).toBe('+6289••••9650');
    expect(masked.id).toBe('s1');
    expect(masked.full_name).toBe('Budi');
    // objek asli tidak termutasi
    expect(student.parent_phone).toBe('+62895339329650');
  });

  it('aman untuk parent_phone null', () => {
    const masked = maskStudentPhone({ id: 's2', parent_phone: null });
    expect(masked.parent_phone).toBeNull();
  });
});
