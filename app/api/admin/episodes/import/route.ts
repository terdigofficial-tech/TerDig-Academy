import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { z } from 'zod';

// Impor massal episode dari roadmap Excel (diparse di sisi klien oleh EpisodeImport).
// Episode yang nomornya sudah ada akan dilewati (tidak menimpa data yang sudah diedit manual).

const importEpisodeSchema = z.object({
  episode_number: z.number().int().min(1).max(999),
  title: z.string().min(1, 'Judul wajib diisi'),
  terdig_level: z.enum(['pemula', 'menengah', 'lanjut']),
  roadmap_level: z.number().int().min(1).max(5),
  duration_minutes: z.number().int().positive().optional(),
  target_age: z.string().optional(),
  theme: z.string().optional(),
  keyword_seo: z.string().optional(),
  notes: z.string().optional(),
  activity_links: z
    .array(
      z.object({
        type: z.enum(['game', 'quiz', 'activity', 'song', 'resource']),
        label: z.string().min(1),
        url: z.string().url(),
      })
    )
    .optional()
    .default([]),
});

const importBodySchema = z.object({
  episodes: z.array(importEpisodeSchema).min(1, 'Tidak ada episode untuk diimpor').max(500),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await req.json();
    const validation = importBodySchema.safeParse(body);
    if (!validation.success) {
      const issues: any[] = (validation.error as any).issues || [];
      return NextResponse.json(
        {
          error: 'Validasi gagal',
          details: issues.map((e: any) => ({ field: (e.path || []).join('.') || '', message: e.message })),
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const incoming = validation.data.episodes;

    // Nomor yang sudah ada di database
    const { data: existingRows, error: existingError } = await supabase
      .from('episodes')
      .select('episode_number');
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    const existingNumbers = new Set((existingRows || []).map((r: any) => r.episode_number));

    const skipped: number[] = [];
    const seenInBatch = new Set<number>();
    const toInsert: any[] = [];
    for (const ep of incoming) {
      if (existingNumbers.has(ep.episode_number) || seenInBatch.has(ep.episode_number)) {
        skipped.push(ep.episode_number);
        continue;
      }
      seenInBatch.add(ep.episode_number);
      toInsert.push({
        episode_number: ep.episode_number,
        title: ep.title,
        terdig_level: ep.terdig_level,
        roadmap_level: ep.roadmap_level,
        status: 'not_started',
        rubric: [],
        youtube_urls: [],
        youtube_url: null,
        duration_minutes: ep.duration_minutes ?? null,
        target_age: ep.target_age ?? null,
        theme: ep.theme ?? null,
        keyword_seo: ep.keyword_seo ?? null,
        notes: ep.notes ?? null,
        facilitator_guide_url: '',
        worksheet_url: '',
        song_url: '',
        thumbnail_url: '',
        activity_links: ep.activity_links ?? [],
      });
    }

    const failed: { episode_number: number; error: string }[] = [];
    let inserted = 0;

    if (toInsert.length > 0) {
      const { error: batchError } = await supabase.from('episodes').insert(toInsert);
      if (!batchError) {
        inserted = toInsert.length;
      } else {
        // Batch gagal (mis. satu baris bermasalah) — coba satu per satu agar sisanya tetap masuk
        console.error('❌ Batch import gagal, beralih ke mode satu-per-satu:', batchError.message);
        for (const row of toInsert) {
          const { error } = await supabase.from('episodes').insert(row);
          if (error) {
            failed.push({ episode_number: row.episode_number, error: error.message });
          } else {
            inserted++;
          }
        }
      }
    }

    console.log(`✅ Import episode: ${inserted} masuk, ${skipped.length} dilewati, ${failed.length} gagal`);
    return NextResponse.json({ inserted, skipped, failed });
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/episodes/import:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
