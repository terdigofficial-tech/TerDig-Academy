-- Ronde 3 TerDig Academy — Modul Leads & Trial (funnel TerDig Smart Session)
-- Dijalankan manual via Supabase Management API (2026-10-02).
-- Semua perubahan aditif: satu tabel baru, belum dipakai kode yang sedang live.
-- Menggantikan pencatatan manual di TRACKER_FUNNEL.xlsx (sheet "Peserta & Voucher").

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_name text NOT NULL,
  parent_name text,
  parent_phone text,
  school_name text,
  school_code text,
  class_label text,
  voucher_code text UNIQUE,
  status text NOT NULL DEFAULT 'amplop_dibagi'
    CHECK (status IN ('amplop_dibagi','klaim_wa','pemetaan','trial_terjadwal','trial_hadir','daftar','belum_minat','hilang')),
  event_date date,
  trial_date date,
  source text NOT NULL DEFAULT 'smart_session',
  notes text,
  converted_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_school_code ON public.leads(school_code);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
