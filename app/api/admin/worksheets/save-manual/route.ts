import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    console.log('\n========================================');
    console.log('=== SAVE MANUAL CORRECTION API ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================================');

    const { student_id, session_id, manual_text, total_score, max_score } = await req.json();

    console.log('Received data:', {
      student_id,
      session_id,
      manual_text_length: manual_text?.length || 0,
      total_score,
      max_score
    });

    if (!student_id || !session_id || total_score === undefined) {
      console.error('❌ Missing required fields');
      return NextResponse.json({ 
        error: 'Data tidak lengkap: student_id, session_id, total_score wajib',
        missing: {
          hasStudentId: !!student_id,
          hasSessionId: !!session_id,
          hasScore: total_score !== undefined
        }
      }, { status: 400 });
    }

    const supabase = createServerClient();

    console.log('\n--- Checking if submission exists ---');
    const { data: existingList, error: checkErr } = await supabase
      .from('worksheet_submissions')
      .select('id, image_url')
      .eq('student_id', student_id)
      .eq('session_id', session_id)
      .limit(1);

    if (checkErr) {
      console.error('❌ Error checking existing submission:', checkErr.message);
      throw checkErr;
    }

    const existing = existingList && existingList.length > 0 ? existingList[0] : null;
    console.log('Existing submission:', existing ? `Found (id: ${existing.id})` : 'Not found');

    const submissionData = {
      image_url: existing?.image_url || '',
      extracted_text: manual_text || '',
      ai_correction: {
        manual_entry: true,
        manual_text: manual_text || '',
        total_score,
        max_score,
        entered_at: new Date().toISOString()
      },
      score: total_score,
      confidence: 1.0,
      tutor_reviewed: true
    };

    console.log('Submission data:', JSON.stringify(submissionData, null, 2));

    let result;
    if (existing) {
      // UPDATE: Submission sudah ada
      console.log('\n--- Updating existing submission ---');
      const { data, error } = await supabase
        .from('worksheet_submissions')
        .update(submissionData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Update failed:', {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details
        });
        throw error;
      }

      console.log('✓ Update successful');
      result = data;
    } else {
      // INSERT: Submission baru
      console.log('\n--- Inserting new submission ---');
      const { data, error } = await supabase
        .from('worksheet_submissions')
        .insert({
          student_id,
          session_id,
          ...submissionData
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Insert failed:', {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details
        });
        throw error;
      }

      console.log('✓ Insert successful');
      result = data;
    }

    console.log('Saved data:', JSON.stringify(result, null, 2));
    console.log('\n✅ SUCCESS: Manual correction saved');
    console.log('========================================\n');

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: 'Koreksi manual tersimpan',
      operation: existing ? 'update' : 'insert'
    });
  } catch (err: any) {
    console.error('\n❌ ERROR in save manual correction');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('========================================\n');

    return NextResponse.json({ 
      error: err.message || 'Gagal menyimpan koreksi',
      details: err.message
    }, { status: 500 });
  }
}
