import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { parseDocx } from '@/lib/parser';
import { generateScenes } from '@/lib/ai-breakdown';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const gradeId = formData.get('grade_id') as string | null;
    
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    fs.writeFileSync(tempPath, buffer);

    const { metadata, raw_text } = await parseDocx(tempPath);
    fs.unlinkSync(tempPath);

    const scenes = await generateScenes(raw_text);

    const supabase = createServerClient();
    const { data: module, error: modErr } = await supabase
      .from('modules')
      .insert({ filename: file.name, raw_text, metadata })
      .select()
      .single();
    if (modErr) throw modErr;

    const kitData: any = {
      module_id: module.id,
      scenes,
      status: 'draft'
    };

    // Tambahkan grade_id jika ada
    if (gradeId) {
      kitData.grade_id = gradeId;
      console.log(`✓ Production kit untuk kelas: ${gradeId}`);
    }

    await supabase.from('production_kits').insert(kitData);

    return NextResponse.json({ success: true, moduleId: module.id });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
