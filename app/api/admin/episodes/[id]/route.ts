import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const activityLinkSchema = z.object({
  type: z.enum(['game', 'quiz', 'activity', 'song', 'resource']),
  label: z.string().min(1, 'Label wajib diisi'),
  url: z.string().url('URL tidak valid'),
});

const episodeUpdateSchema = z.object({
  episode_number: z.number().int().min(1).max(999).optional(),
  title: z.string().min(1, 'Judul wajib diisi').optional(),
  terdig_level: z.enum(['pemula', 'menengah', 'lanjut']).optional(),
  roadmap_level: z.number().int().min(1).max(5).optional(),
  youtube_url: z.string().url().optional().or(z.literal('')).optional(),
  youtube_urls: z.array(z.string().url()).optional(),
  duration_minutes: z.number().int().positive().optional(),
  target_age: z.string().optional(),
  theme: z.string().optional(),
  keyword_seo: z.string().optional(),
  notes: z.string().optional(),
  rubric: z
    .array(z.object({ name: z.string().min(1), max_score: z.number().int().positive() }))
    .optional(),
  status: z.enum(['not_started', 'in_progress', 'published', 'archived']).optional(),
  facilitator_guide_url: z.string().nullable().optional(),
  worksheet_url: z.string().nullable().optional(),
  song_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  activity_links: z.array(activityLinkSchema).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching episode:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in GET episode:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Normalisasi null menjadi empty string untuk field URL
    const normalizedData = {
      ...body,
      facilitator_guide_url: body.facilitator_guide_url || '',
      worksheet_url: body.worksheet_url || '',
      song_url: body.song_url || '',
      thumbnail_url: body.thumbnail_url || '',
    };

    const validation = episodeUpdateSchema.safeParse(normalizedData);

    if (!validation.success) {
      const issues: any[] = (validation.error as any).issues || [];
      const errors = issues.map((e: any) => ({
        field: (e.path || []).join('.') || '',
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validasi gagal', details: errors }, { status: 400 });
    }

    const supabase = createServerClient();

    // Cek apakah episode ada
    const { data: existing } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
    }

    // Cek duplikasi episode_number jika diubah
    if (validation.data.episode_number) {
      const { data: dup } = await supabase
        .from('episodes')
        .select('id')
        .eq('episode_number', validation.data.episode_number)
        .neq('id', id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          { error: `Episode nomor ${validation.data.episode_number} sudah digunakan` },
          { status: 409 }
        );
      }
    }

    // Handle publish — set published_at
    const updateData: any = { ...validation.data };
    if (updateData.status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('episodes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating episode:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Episode updated:', data.episode_number, '-', data.title);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in PUT episode:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Ambil data episode untuk hapus file dari storage
    const { data: episode } = await supabase
      .from('episodes')
      .select('episode_number, facilitator_guide_url, worksheet_url, song_url, thumbnail_url')
      .eq('id', id)
      .single();

    if (!episode) {
      return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
    }

    // Hapus file dari storage
    const filesToDelete: string[] = [];
    const extractPath = (url: string | null) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        // Path format: /storage/v1/object/public/episode-files/...
        const match = u.pathname.match(/\/episode-files\/(.+)/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    };

    const paths = [
      extractPath(episode.facilitator_guide_url),
      extractPath(episode.worksheet_url),
      extractPath(episode.song_url),
      extractPath(episode.thumbnail_url),
    ].filter(Boolean) as string[];

    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('episode-files').remove(paths);
      if (storageErr) {
        console.warn('⚠️ Gagal hapus file dari storage:', storageErr.message);
      }
    }

    // Hapus episode dari database
    const { error } = await supabase.from('episodes').delete().eq('id', id);

    if (error) {
      console.error('❌ Error deleting episode:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Episode deleted:', episode.episode_number);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Error in DELETE episode:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
