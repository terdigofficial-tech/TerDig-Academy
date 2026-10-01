-- Ronde 2 TerDig Academy — SPP + jam & kapasitas sesi
-- Dijalankan manual via Supabase Management API (2026-10-02).
-- Semua perubahan aditif & aman untuk kode lama: kolom baru nullable/ber-default,
-- tabel baru belum dipakai kode yang sedang live.

-- 1) Sesi: jam mulai/selesai + kapasitas (aturan kelas kecil maks 5–8 anak)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 8;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_capacity_check') THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_capacity_check CHECK (capacity >= 1 AND capacity <= 30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_time_order_check') THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_time_order_check
      CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time);
  END IF;
END $$;

-- 2) SPP: tagihan bulanan per siswa (satu tagihan per siswa per periode)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount integer NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, period)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS invoices_period_idx ON public.invoices (period);
CREATE INDEX IF NOT EXISTS invoices_student_idx ON public.invoices (student_id);

-- 3) SPP: pembayaran (satu tagihan bisa dicicil beberapa pembayaran)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'transfer'
    CHECK (method IN ('qris', 'transfer', 'cash', 'other')),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON public.payments (invoice_id);
