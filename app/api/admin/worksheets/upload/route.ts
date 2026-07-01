import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('student_id') as string;
    const sessionId = formData.get('session_id') as string;

    if (!file || !studentId || !sessionId) {
      return NextResponse.json({ 
        error: 'file, student_id, session_id wajib',
        missing: {
          hasFile: !!file,
          hasStudentId: !!studentId,
          hasSessionId: !!sessionId
        }
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File terlalu besar (${Math.round(file.size / 1024 / 1024)}MB). Max 10MB.`
      }, { status: 400 });
    }

    // Get Supabase client
    const supabase = createServerClient();

    // CHECK: List buckets to verify worksheets bucket exists

    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
    
    if (bucketsErr) {
      console.error('❌ ERROR listing buckets:', bucketsErr.message);
      throw new Error(`Failed to list buckets: ${bucketsErr.message}`);
    }

    const worksheetsBucket = buckets?.find(b => b.name === 'worksheets');
    if (!worksheetsBucket) {
      console.error('❌ ERROR: Bucket "worksheets" not found in Supabase');
      console.error('Available buckets:', buckets?.map(b => b.name).join(', ') || 'none');
      return NextResponse.json({ 
        success: false,
        error: 'Storage bucket "worksheets" tidak ditemukan',
        message: 'OWNER ACTION REQUIRED: Buat bucket di Supabase Dashboard → Storage → Create new bucket → nama: worksheets → centang "Public bucket" → Create',
        availableBuckets: buckets?.map(b => b.name) || [],
        solution: 'Bucket belum dibuat atau nama tidak sesuai'
      }, { status: 500 });
    }

    // Upload ke Storage
    const fileName = `${sessionId}/${studentId}/${Date.now()}_${file.name}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('worksheets')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadErr) {
      console.error('❌ Storage upload FAILED');
      console.error('Full error object:', JSON.stringify(uploadErr, null, 2));
      console.error('Error details:', {
        message: uploadErr.message,
        status: (uploadErr as any).status,
        statusCode: (uploadErr as any).statusCode,
        details: (uploadErr as any).details,
        hint: (uploadErr as any).hint,
        cause: (uploadErr as any).cause
      });
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    // Dapatkan URL publik
    const { data: urlData } = supabase.storage.from('worksheets').getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    // Simpan ke worksheet_submissions
    const { data: submission, error: insertErr } = await supabase
      .from('worksheet_submissions')
      .insert({ 
        student_id: studentId, 
        session_id: sessionId, 
        image_url: imageUrl
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Database insert error:', insertErr.message);
      throw new Error(`Database insert failed: ${insertErr.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      submission,
      message: 'Lembar kerja berhasil di-upload'
    });
  } catch (err: any) {
    console.error('Worksheet upload error:', err.message, err.stack);

    return NextResponse.json({ 
      success: false,
      error: err.message || 'Upload lembar kerja gagal',
      details: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
