import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function GET(req: NextRequest) {
  try {
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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Judul
    doc.setFontSize(18);
    doc.text('Laporan TerDig Academy', pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.text(`Dibuat: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    for (const r of reports || []) {
      // Cek apakah perlu halaman baru
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(13);
      doc.text(`Siswa: ${r.students?.full_name}`, 14, y);
      y += 6;
      doc.setFontSize(10);
      const sessionInfo = r.sessions;
      const episodeInfo = sessionInfo?.episodes;
      const materi = episodeInfo 
        ? `EP-${String(episodeInfo.episode_number).padStart(3, '0')} - ${episodeInfo.title}`
        : sessionInfo?.title || '-';
      doc.text(`Materi: ${materi}`, 14, y);
      y += 5;
      doc.text(`Tanggal Sesi: ${sessionInfo?.date ? new Date(sessionInfo.date).toLocaleDateString('id-ID') : '-'}`, 14, y);
      y += 5;
      doc.text(`Status WA: ${r.wa_status}`, 14, y);
      y += 7;

      // Konten laporan
      const content = r.content_json?.text || '-';
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(content, pageWidth - 28);
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 4;
      }
      y += 6;
      // Garis pemisah
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="laporan-terdig-academy.pdf"'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
