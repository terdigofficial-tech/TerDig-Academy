# TerDig Academy — Management System

Sistem manajemen bimbel berbasis AI untuk TerDig Academy. Mengelola episode, sesi, siswa, penilaian, dan laporan orang tua secara terintegrasi.

## Fitur Utama

- **📚 Episode Manager** — Upload & kelola materi pembelajaran, worksheet, dan lagu per episode
- **📅 Session Manager** — Jadwal kelas dengan filter per level (Pemula/Menengah/Lanjut)
- **✅ Attendance & Assessment** — Catat kehadiran dan nilai observasi siswa per sesi
- **👥 Student Management** — Data siswa lengkap dengan info orang tua dan status level
- **📝 Worksheet Scanner** — Upload foto lembar kerja, koreksi otomatis via AI (Groq Llama Vision)
- **🤖 AI Report Generator** — Generate laporan personal orang tua via Groq AI (llama-3.3-70b)
- **📱 WhatsApp Integration** — Kirim laporan via WhatsApp (copy to clipboard / buka wa.me)
- **📊 Dashboard & Analytics** — Statistik, grafik tren kehadiran, distribusi level, dan status laporan

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (worksheets, episode files) |
| **AI/ML** | Groq AI (llama-3.3-70b, Llama 4 Scout Vision) |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **Deployment** | Vercel |

## Setup

### Prasyarat

- Node.js 20+
- Akun Supabase (gratis)
- API Key Groq (gratis)

### Instalasi

```bash
git clone <repo-url>
cd terdig-bimbel-ai
npm install
```

### Environment Variables

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...
```

### Database

Jalankan file SQL di folder `migrations/` melalui Supabase SQL Editor, urut dari FASE7 hingga FASE17.

### Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Struktur Folder

```
terdig-bimbel-ai/
├── app/                    # Next.js pages & API routes
│   ├── admin/              # Admin pages (dashboard, episodes, sessions, etc.)
│   ├── api/                # API endpoints (admin, auth, etc.)
│   └── login/              # Login page
├── components/             # Reusable UI components
│   ├── Episodes/           # Episode-related components
│   ├── Parents/            # Parent-related components
│   ├── Reports/            # Report-related components
│   ├── Sessions/           # Session-related components
│   └── ...
├── lib/                    # Utility functions
│   ├── ai-breakdown.ts     # AI scene generation from modules
│   ├── auth.ts             # Authentication helpers
│   ├── parser.ts           # Text parsing utilities
│   ├── progression.ts      # Student progression & level-up logic
│   ├── reporter.ts         # AI report generation engine
│   ├── supabase-server.ts  # Supabase server client
│   └── youtube.ts          # YouTube integration
├── migrations/             # SQL migration files
├── public/                 # Static assets
├── types/                  # TypeScript interfaces
├── .env.local              # Environment variables (JANGAN commit!)
└── package.json
```

## API Endpoints

### Admin API (prefix: `/api/admin`)

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/dashboard/charts` | GET | Data grafik dashboard |
| `/sessions` | GET/POST | CRUD sesi belajar |
| `/sessions/[id]` | GET/PUT | Detail sesi |
| `/sessions/[id]/reports` | GET | Laporan per sesi |
| `/episodes` | GET/POST | CRUD episode |
| `/episodes/[id]` | GET/PUT/DELETE | Detail episode |
| `/episodes/upload` | POST | Upload file episode |
| `/students` | GET/POST | CRUD siswa |
| `/students/[id]` | GET/PUT | Detail siswa |
| `/students/[id]/parents` | GET | Data orang tua siswa |
| `/attendance` | POST | Simpan kehadiran |
| `/assessments` | POST | Simpan penilaian |
| `/worksheets/upload` | POST | Upload foto lembar kerja |
| `/worksheets/correct` | POST | Koreksi otomatis via AI |
| `/reports` | GET | Daftar laporan orang tua |
| `/reports/generate` | POST | Generate laporan AI |
| `/reports/send-wa` | POST | Kirim via WhatsApp |
| `/reports/export` | GET | Export semua laporan |
| `/reports/export/pdf` | GET | Export PDF per laporan |
| `/progression` | POST | Cek kenaikan level siswa |

## Deployment

```bash
npm run build
npm start
```

Deploy ke Vercel:

```bash
npx vercel --prod
```

## License

© 2026 TerDig Academy. All rights reserved.
