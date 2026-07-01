import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: reports } = await supabase
    .from('parent_reports')
    .select(`
      *,
      students (full_name),
      sessions (
        title,
        date,
        target_level,
        episodes (episode_number, title)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  let markdown = '# Laporan TerDig Academy\n\n';
  markdown += `Dibuat: ${new Date().toLocaleDateString('id-ID')}\n\n---\n\n`;

  for (const r of reports || []) {
    const sessionInfo = r.sessions;
    const episodeInfo = sessionInfo?.episodes;
    const materi = episodeInfo 
      ? `EP-${String(episodeInfo.episode_number).padStart(3, '0')} - ${episodeInfo.title}`
      : sessionInfo?.title || '-';
    
    markdown += `## Siswa: ${r.students?.full_name}\n`;
    markdown += `Materi: ${materi}\n`;
    markdown += `Tanggal Sesi: ${sessionInfo?.date ? new Date(sessionInfo.date).toLocaleDateString('id-ID') : '-'}\n`;
    markdown += `Level: ${sessionInfo?.target_level || '-'}\n`;
    markdown += `Status WA: ${r.wa_status}\n\n`;
    markdown += `${r.content_json?.text || '-'}\n\n---\n\n`;
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="laporan-terdig-academy.md"'
    }
  });
}
