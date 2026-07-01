import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mammoth dan fs
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock('fs', () => ({}));

import mammoth from 'mammoth';

// Import AFTER mock
import { parseDocx } from '@/lib/parser';

describe('parseDocx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('harus mengekstrak metadata dengan benar', async () => {
    const mockDocxContent = `
Judul: Matematika Kelas 1
Kelas: 1 SD
Mata Pelajaran: Matematika
Durasi: 45 menit

Ini adalah konten pembelajaran.
Sesi ini membahas penjumlahan.
    `.trim();

    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockResolvedValue({
      value: mockDocxContent,
    });

    const result = await parseDocx('/path/to/file.docx');
    
    expect(result.metadata.title).toBe('Matematika Kelas 1');
    expect(result.metadata.grade).toBe('1 SD');
    expect(result.metadata.subject).toBe('Matematika');
    expect(result.metadata.duration).toBe('45 menit');
  });

  it('harus memisahkan metadata dari konten', async () => {
    const mockDocxContent = `
Judul: Membaca
Kelas: 2 SD
Mata Pelajaran: Bahasa Indonesia
Durasi: 30 menit

Paragraf pertama tentang membaca.
Paragraf kedua tentang menulis.
Ini adalah latihan soal.
    `.trim();

    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockResolvedValue({
      value: mockDocxContent,
    });

    const result = await parseDocx('/path/to/file.docx');
    
    expect(result.raw_text).toContain('Paragraf pertama tentang membaca');
    expect(result.raw_text).toContain('Paragraf kedua tentang menulis');
    expect(result.raw_text).toContain('Ini adalah latihan soal');
    // Metadata tidak boleh masuk ke raw_text
    expect(result.raw_text).not.toContain('Judul:');
    expect(result.raw_text).not.toContain('Kelas:');
  });

  it('harus mengembalikan metadata kosong jika tidak ada metadata', async () => {
    const mockDocxContent = `
Ini adalah konten tanpa metadata.
Hanya ada teks biasa.
    `.trim();

    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockResolvedValue({
      value: mockDocxContent,
    });

    const result = await parseDocx('/path/to/file.docx');
    
    expect(result.metadata.title).toBeUndefined();
    expect(result.metadata.grade).toBeUndefined();
    expect(result.metadata.subject).toBeUndefined();
    expect(result.metadata.duration).toBeUndefined();
    expect(result.raw_text).toContain('Ini adalah konten tanpa metadata');
  });

  it('harus menangani metadata parsial (hanya beberapa field)', async () => {
    const mockDocxContent = `
Judul: Sains Dasar
Durasi: 60 menit

Materi tentang tata surya.
    `.trim();

    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockResolvedValue({
      value: mockDocxContent,
    });

    const result = await parseDocx('/path/to/file.docx');
    
    expect(result.metadata.title).toBe('Sains Dasar');
    expect(result.metadata.duration).toBe('60 menit');
    expect(result.metadata.grade).toBeUndefined();
    expect(result.metadata.subject).toBeUndefined();
  });

  it('harus menggabungkan baris konten dengan newline', async () => {
    const mockDocxContent = `
Judul: Test
Kelas: 3 SD

Baris pertama konten.
Baris kedua konten.
Baris ketiga konten.
    `.trim();

    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockResolvedValue({
      value: mockDocxContent,
    });

    const result = await parseDocx('/path/to/file.docx');
    
    expect(result.raw_text).toBe('Baris pertama konten.\nBaris kedua konten.\nBaris ketiga konten.');
  });

  it('harus menangani ekstraksi yang gagal (mammoth error)', async () => {
    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('File tidak dapat dibaca')
    );

    await expect(parseDocx('/path/to/bad.docx')).rejects.toThrow('File tidak dapat dibaca');
  });

  it('harus trim spasi berlebih dari setiap baris', async () => {
    const mockDocxContent = `
Judul:    Bahasa Inggris
Kelas:  4 SD
Mata Pelajaran:    English

    Konten dengan indentasi.  
  Konten dengan spasi depan.
    `.trim();

    (mammoth.extractRawText as ReturnType<typeof vi.fn>).mockResolvedValue({
      value: mockDocxContent,
    });

    const result = await parseDocx('/path/to/file.docx');
    
    expect(result.metadata.title).toBe('Bahasa Inggris');
    expect(result.metadata.grade).toBe('4 SD');
    expect(result.metadata.subject).toBe('English');
    // Konten harus di-trim
    expect(result.raw_text).toContain('Konten dengan indentasi.');
    expect(result.raw_text).toContain('Konten dengan spasi depan.');
  });
});
