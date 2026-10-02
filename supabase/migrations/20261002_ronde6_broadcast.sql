-- Ronde 6 (2026-10-02): Broadcast pengumuman ke orang tua.
-- Satu broadcast -> banyak penerima (satu per siswa aktif), masing-masing dengan
-- teks terpersonalisasi dan status terkirim. Pengiriman via wa.me (manual per penerima).

CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message_template text NOT NULL,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_name text,
  parent_phone text,
  personalized_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, student_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'broadcast_recipients_status_check') THEN
    ALTER TABLE broadcast_recipients
      ADD CONSTRAINT broadcast_recipients_status_check
      CHECK (status IN ('pending', 'sent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast
  ON broadcast_recipients (broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status
  ON broadcast_recipients (broadcast_id, status);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
