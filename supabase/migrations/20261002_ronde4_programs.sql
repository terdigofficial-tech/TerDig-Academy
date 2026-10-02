-- Ronde 4 (2026-10-02): restruktur Program menjadi 3 program resmi TerDig.
-- Tier (Reguler/Premium/Privat) pindah menjadi atribut siswa, bukan baris program.
-- Baris program di-UPDATE in-place (UUID dipertahankan) sehingga FK students.program_id aman.

-- 1) Kolom baru di programs: phase_key (jalur kurikulum) + target_label (rentang kelas)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS phase_key text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS target_label text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_phase_key_check') THEN
    ALTER TABLE programs
      ADD CONSTRAINT programs_phase_key_check
      CHECK (phase_key IS NULL OR phase_key IN ('fase_a', 'fase_b', 'fase_c'));
  END IF;
END $$;

-- 2) Tiga baris lama (tier) -> tiga program resmi
UPDATE programs SET
  name = 'Calistung Ceria',
  description = 'Baca, tulis, dan hitung dengan metode bermain untuk TK–SD kelas 2. Kurikulum Fase A (60 episode).',
  phase_key = 'fase_a',
  target_label = 'TK – SD kelas 2'
WHERE name = 'Reguler';

UPDATE programs SET
  name = 'IPAS & Tematik Visual',
  description = 'Pendalaman Matematika, Bahasa Indonesia, dan IPAS dengan visual dan virtual field trip untuk SD kelas 3–6. Kurikulum Fase B (72 episode); Fase C menyusul.',
  phase_key = 'fase_b',
  target_label = 'SD kelas 3–6'
WHERE name = 'Premium';

UPDATE programs SET
  name = 'Kelas Kreator Cilik',
  description = 'Desain grafis dasar, mengetik, dan Scratch/block coding. Dari penonton pasif menjadi kreator aktif era AI.',
  phase_key = NULL,
  target_label = 'TK – SD'
WHERE name = 'Privat';

-- 3) Tier sebagai atribut siswa
ALTER TABLE students ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'reguler';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_tier_check') THEN
    ALTER TABLE students
      ADD CONSTRAINT students_tier_check
      CHECK (tier IN ('reguler', 'premium', 'privat'));
  END IF;
END $$;
