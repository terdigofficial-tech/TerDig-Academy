import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('episodes')
      .select('id, episode_number, title, terdig_level')
      .in('status', ['published', 'in_progress'])
      .order('episode_number', { ascending: true });

    if (error) {
      console.error('❌ Error fetching episodes for dropdown:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const episodes = (data || []).map((ep) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      title: ep.title,
      terdig_level: ep.terdig_level,
      label: `EP-${String(ep.episode_number).padStart(3, '0')} - ${ep.title} (${ep.terdig_level.charAt(0).toUpperCase() + ep.terdig_level.slice(1)})`,
    }));

    return NextResponse.json({ data: episodes });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/episodes/dropdown:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
