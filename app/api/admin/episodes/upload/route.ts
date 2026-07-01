import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const uploadSchema = z.object({
  fileType: z.enum(['facilitator_guide', 'worksheet', 'song', 'thumbnail']),
});

const ALLOWED_TYPES: Record<string, { mime: string[]; ext: string[] }> = {
  facilitator_guide: { mime: ['application/pdf'], ext: ['.pdf'] },
  worksheet: { mime: ['application/pdf'], ext: ['.pdf'] },
  song: { mime: ['audio/mpeg', 'audio/mp3'], ext: ['.mp3'] },
  thumbnail: { mime: ['image/jpeg', 'image/png', 'image/webp'], ext: ['.jpg', '.jpeg', '.png', '.webp'] },
};

export async function POST(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID episode wajib dikirim sebagai query parameter (?id=...)' }, { status: 400 });
    }
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string;

    if (!file) {
      return NextResponse.json({ error: 'File wajib diupload' }, { status: 400 });
    }

    const validation = uploadSchema.safeParse({ fileType });
    if (!validation.success) {
      return NextResponse.json({ error: 'Tipe file tidak valid' }, { status: 400 });
    }

    const { fileType: type } = validation.data;
    const allowed = ALLOWED_TYPES[type];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.ext.includes(ext)) {
      return NextResponse.json(
        { error: `Format file tidak didukung untuk ${type}. Gunakan: ${allowed.ext.join(', ')}` },
        { status: 400 }
      );
    }

    if (!allowed.mime.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipe MIME tidak valid: ${file.type}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek episode exists (skip jika id='new' — create mode)
    let episodeNumber = 0;
    if (id !== 'new') {
      const { data: episode, error: fetchErr } = await supabase
        .from('episodes')
        .select('episode_number')
        .eq('id', id)
        .single();

      if (fetchErr || !episode) {
        return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
      }
      episodeNumber = episode.episode_number;
    }

    // Upload ke Supabase Storage
    const folderMap: Record<string, string> = {
      facilitator_guide: 'facilitator-guides',
      worksheet: 'worksheets',
      song: 'songs',
      thumbnail: 'thumbnails',
    };

    const folder = folderMap[type];
    const prefix = episodeNumber || Date.now();
    const fileName = `${prefix}-${Date.now()}${ext}`;
    const filePath = `${folder}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('episode-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('❌ Storage upload error:', uploadErr);
      return NextResponse.json({ error: `Gagal upload ke storage: ${uploadErr.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('episode-files').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Update episode dengan URL file (skip jika id='new' — URL akan dikirim via POST)
    if (id !== 'new') {
      const urlColumnMap: Record<string, string> = {
        facilitator_guide: 'facilitator_guide_url',
        worksheet: 'worksheet_url',
        song: 'song_url',
        thumbnail: 'thumbnail_url',
      };

      const column = urlColumnMap[type];
      const { error: updateErr } = await supabase
        .from('episodes')
        .update({ [column]: publicUrl })
        .eq('id', id);

      if (updateErr) {
        console.error('❌ Error updating episode URL:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    console.log(`✅ File ${type} uploaded${id !== 'new' ? ` for episode ${episodeNumber}` : ' (pending — create mode)'}:`, fileName);
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filePath,
      message: `File ${type} berhasil diupload`,
    });
  } catch (err: any) {
    console.error('❌ Error in upload endpoint:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
