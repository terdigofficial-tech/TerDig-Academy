import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    console.log('\n========================================');
    console.log('=== TEST WORKSHEET UPLOAD (Server-side) ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================================');

    // Get Supabase client
    console.log('\n--- Initializing Supabase client ---');
    const supabase = createServerClient();
    console.log('✓ Supabase client initialized');

    // CHECK: List buckets
    console.log('\n--- Listing buckets ---');
    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
    
    if (bucketsErr) {
      console.error('❌ ERROR listing buckets:', bucketsErr.message);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to list buckets',
        details: bucketsErr.message
      }, { status: 500 });
    }

    console.log('Available buckets:', buckets?.map(b => ({ name: b.name, public: b.public })) || []);

    const worksheetsBucket = buckets?.find(b => b.name === 'worksheets');
    if (!worksheetsBucket) {
      console.error('❌ Bucket "worksheets" not found');
      return NextResponse.json({ 
        success: false,
        error: 'Bucket "worksheets" tidak ditemukan',
        availableBuckets: buckets?.map(b => b.name),
        solution: 'Buat bucket di Supabase Dashboard'
      }, { status: 500 });
    }

    console.log('✓ Bucket "worksheets" found and public:', worksheetsBucket.public);

    // Create test file
    console.log('\n--- Creating test file ---');
    const testContent = 'Test worksheet image content - ' + new Date().toISOString();
    const buffer = Buffer.from(testContent, 'utf8');
    console.log('Test buffer created:', {
      size: buffer.length,
      content: testContent.substring(0, 50) + '...'
    });

    // Upload test file
    console.log('\n--- Uploading test file ---');
    const fileName = `test/${Date.now()}_test.txt`;
    console.log('Target path:', fileName);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('worksheets')
      .upload(fileName, buffer, {
        contentType: 'text/plain',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadErr) {
      console.error('❌ Upload FAILED');
      console.error('Full error:', JSON.stringify(uploadErr, null, 2));
      return NextResponse.json({ 
        success: false,
        error: 'Upload failed',
        details: uploadErr.message,
        errorObject: {
          message: uploadErr.message,
          status: (uploadErr as any).status,
          statusCode: (uploadErr as any).statusCode,
          details: (uploadErr as any).details,
          hint: (uploadErr as any).hint
        }
      }, { status: 500 });
    }

    console.log('✓ Upload successful');
    console.log('Upload response:', JSON.stringify(uploadData, null, 2));

    // Get public URL
    console.log('\n--- Getting public URL ---');
    const { data: urlData } = supabase.storage.from('worksheets').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    console.log('Public URL:', publicUrl);

    // Delete test file
    console.log('\n--- Cleaning up test file ---');
    const { error: deleteErr } = await supabase.storage
      .from('worksheets')
      .remove([fileName]);

    if (deleteErr) {
      console.warn('⚠️ Failed to delete test file:', deleteErr.message);
    } else {
      console.log('✓ Test file deleted');
    }

    console.log('\n✅ TEST SUCCESS: Supabase storage is working!');
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      message: 'Supabase storage is working correctly',
      testResults: {
        bucketsListed: buckets?.length,
        worksheetsBucketFound: true,
        worksheetsBucketPublic: worksheetsBucket.public,
        uploadSuccessful: true,
        publicUrl: publicUrl,
        fileName: fileName
      },
      nextSteps: 'Try uploading worksheet from frontend'
    });
  } catch (err: any) {
    console.error('\n❌ CRITICAL ERROR in test upload');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('========================================\n');

    return NextResponse.json({
      success: false,
      error: 'Test upload failed',
      details: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
