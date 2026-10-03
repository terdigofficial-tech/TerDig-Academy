-- Ronde 8: jadwal mingguan berulang + ruangan
-- 1) Kolom ruangan di sessions (nullable agar data lama tetap valid)
-- 2) Tabel recurring_schedules (pola jadwal mingguan) + FK dari sessions

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS recurring_schedule_id uuid;

CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  target_level text NOT NULL CHECK (target_level IN ('pemula', 'menengah', 'lanjut')),
  tutor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  days_of_week int[] NOT NULL CHECK (array_length(days_of_week, 1) BETWEEN 1 AND 7),
  start_time text,
  end_time text,
  room text,
  capacity int NOT NULL DEFAULT 8 CHECK (capacity BETWEEN 1 AND 30),
  valid_from date NOT NULL,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

-- Setiap tanggal hanya boleh punya satu sesi hasil generate dari satu jadwal rutin
CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_recurring_date
  ON public.sessions (recurring_schedule_id, date)
  WHERE recurring_schedule_id IS NOT NULL;

ALTER TABLE public.sessions
  ADD CONSTRAINT fk_sessions_recurring_schedule
  FOREIGN KEY (recurring_schedule_id)
  REFERENCES public.recurring_schedules(id)
  ON DELETE SET NULL;

ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Ronde 8 (tambahan): episode awal untuk sesi hasil generate
-- (sessions.episode_id NOT NULL, jadi jadwal rutin wajib menunjuk satu episode;
-- episode per sesi bisa diubah manual setelahnya, atau episode jadwal dimajukan
-- lalu generate ulang untuk tanggal-tanggal berikutnya)
ALTER TABLE public.recurring_schedules
  ADD COLUMN IF NOT EXISTS episode_id uuid REFERENCES public.episodes(id) ON DELETE RESTRICT;
