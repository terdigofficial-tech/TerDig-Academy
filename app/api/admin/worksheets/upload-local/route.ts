import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * FALLBACK: Local Storage Upload
 * 
 * Jika Supabase Storage gagal, gunakan local storage sebagai fallback sementara.
 * Files akan disimpan di public/uploads/worksheets/
 * 
 * Nanti bisa dipindahkan ke Supabase Storage setelah issue resolved.
 */

export async function POST(req: NextRequest) {
  try {
    console.log('\n========================================');
    console.log('=== WORKSHEET UPLOAD (Local Fallback) ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================================');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('student_id') as string;
    const sessionId = formData.get('session_id') as string;

    console.log('FormData received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      studentId,
      sessionId
    });

    if (!file || !studentId || !sessionId) {
      console.error('❌ Missing required fields');
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ File too large');
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    console.log('✓ Validation passed');

    // Create directory structure
    console.log('\n--- Creating directory structure ---');
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'worksheets', sessionId, studentId);
    console.log('Upload directory:', uploadDir);

    try {
      await mkdir(uploadDir, { recursive: true });
      console.log('✓ Directory created/verified');
    } catch (mkErr: any) {
      console.error('❌ Failed to create directory:', mkErr.message);
      throw mkErr;
    }

    // Save file locally
    console.log('\n--- Saving file locally ---');
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = join(uploadDir, fileName);
    console.log('File path:', filePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer size:', buffer.length, 'bytes');

    try {
      await writeFile(filePath, buffer);
      console.log('✓ File saved successfully');
    } catch (writeErr: any) {
      console.error('❌ Failed to write file:', writeErr.message);
      throw writeErr;
    }

    // Generate local URL
    const imageUrl = `/uploads/worksheets/${sessionId}/${studentId}/${fileName}`;
    console.log('Local URL generated:', imageUrl);

    console.log('\n⚠️ WARNING: Using LOCAL STORAGE (Supabase failed)');
    console.log('This is a temporary fallback. Should move to Supabase when fixed.');
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      message: 'File saved locally (Supabase fallback)',
      imageUrl,
      warning: 'Using local storage - move to Supabase when ready',
      fileName,
      filePath
    });
  } catch (err: any) {
    console.error('\n❌ LOCAL UPLOAD ERROR');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('========================================\n');

    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
