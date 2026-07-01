import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const episodeSchema = z.object({
  episode_number: z.number().int().min(1).max(60),
  title: z.string().min(1, 'Judul wajib diisi'),
  terdig_level: z.enum(['pemula', 'menengah', 'lanjut']),
  roadmap_level: z.number().int().min(1).max(5),
  youtube_url: z.string().url().optional().or(z.literal('')),
  youtube_urls: z.array(z.string().url()).optional(),
  duration_minutes: z.number().int().positive().optional(),
  target_age: z.string().optional(),
  theme: z.string().optional(),
  keyword_seo: z.string().optional(),
  notes: z.string().optional(),
  rubric: z
    .array(z.object({ name: z.string().min(1), max_score: z.number().int().positive() }))
    .optional(),
  facilitator_guide_url: z.string().optional(),
  worksheet_url: z.string().optional(),
  song_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const level = searchParams.get('terdig_level') || '';
    const roadmapLevel = searchParams.get('roadmap_level') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'episode_number';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query
    let query = supabase.from('episodes').select('*', { count: 'exact' });

    // Filters
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (level) {
      query = query.eq('terdig_level', level);
    }
    if (roadmapLevel) {
      query = query.eq('roadmap_level', parseInt(roadmapLevel));
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Sort
    const allowedSorts = ['episode_number', 'title', 'terdig_level', 'roadmap_level', 'status', 'created_at'];
    const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'episode_number';
    const ascending = sortOrder !== 'desc';
    query = query.order(safeSort, { ascending });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching episodes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/episodes:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = episodeSchema.safeParse(body);

    if (!validation.success) {
      const issues: any[] = (validation.error as any).issues || [];
      const errors = issues.map((e: any) => ({
        field: (e.path || []).join('.') || '',
        message: e.message,
      }));
      return NextResponse.json({ error: 'Validasi gagal', details: errors }, { status: 400 });
    }

    const supabase = createServerClient();

    // Cek duplikasi episode_number
    const { data: existing } = await supabase
      .from('episodes')
      .select('id')
      .eq('episode_number', validation.data.episode_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Episode nomor ${validation.data.episode_number} sudah ada` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('episodes')
      .insert({
        ...validation.data,
        status: 'not_started',
        rubric: validation.data.rubric || [],
        youtube_url: validation.data.youtube_url || null,
        youtube_urls: validation.data.youtube_urls || [],
        duration_minutes: validation.data.duration_minutes || null,
        target_age: validation.data.target_age || null,
        theme: validation.data.theme || null,
        keyword_seo: validation.data.keyword_seo || null,
        notes: validation.data.notes || null,
        facilitator_guide_url: validation.data.facilitator_guide_url || '',
        worksheet_url: validation.data.worksheet_url || '',
        song_url: validation.data.song_url || '',
        thumbnail_url: validation.data.thumbnail_url || '',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating episode:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Episode created:', data.episode_number, '-', data.title);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/episodes:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
