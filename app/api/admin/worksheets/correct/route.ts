import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import Groq from 'groq-sdk';

function getGroqClient(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
}

const VISION_SYSTEM_PROMPT = `Anda adalah mesin OCR profesional untuk lembar kerja siswa SD.
Tugas: Membaca foto lembar kerja dan mengekstrak jawaban siswa secara akurat.
Prinsip: Akurasi tinggi, jangan pernah menginferensi, laporkan apa adanya.`;

const CORRECTION_SYSTEM_PROMPT = `Anda adalah korektor ujian profesional untuk SD.
Tugas: Membandingkan jawaban siswa dengan kunci jawaban secara objektif.
Prinsip: Konsisten, adil, beri komentar edukatif yang membantu siswa belajar.`;

export async function POST(req: NextRequest) {
  try {
    const { submissionId } = await req.json();
    if (!submissionId) return NextResponse.json({ error: 'submissionId wajib' }, { status: 400 });

    const supabase = createServerClient();

    // Ambil submission untuk answer_key (via production_kits FK on session_id)
    const { data: submission, error: fetchErr } = await supabase
      .from('worksheet_submissions')
      .select('*, production_kits:session_id(answer_key)')
      .eq('id', submissionId)
      .single();
    
    if (fetchErr || !submission) {
      console.error('❌ Submission not found:', submissionId);
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });
    }

    const answerKey = submission.production_kits?.answer_key;
    if (!answerKey || answerKey.length === 0) {
      console.error('❌ Answer key not found');
      return NextResponse.json({ error: 'Modul belum memiliki kunci jawaban' }, { status: 400 });
    }

    // Step 1: Vision - ekstrak jawaban siswa dari gambar
    const imageResponse = await fetch(submission.image_url);
    if (!imageResponse.ok) {
      throw new Error('Gagal mengakses gambar lembar kerja');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const visionPrompt = `Baca foto lembar kerja siswa ini dan ekstrak HANYA jawaban yang ditulis siswa.

INSTRUKSI PENTING:
- Abaikan soal, abaikan petunjuk, abaikan teks lain.
- Fokus HANYA pada pilihan jawaban yang ditandai siswa:
  * Tanda silang (X)
  * Lingkaran (O)
  * Garis bawah
  * Coretan/tulisan tangan yang menunjuk ke A, B, C, D
- Untuk setiap nomor soal, catat jawaban siswa (huruf saja: A, B, C, D).
- Jika jawaban tidak terbaca atau tidak ada, tulis "tidak terbaca".
- JANGAN ubah atau inferensi jawaban.

OUTPUT FORMAT (WAJIB JSON MURNI):
{
  "answers": [
    {"question_number": 1, "student_answer": "C"},
    {"question_number": 2, "student_answer": "A"},
    {"question_number": 3, "student_answer": "tidak terbaca"}
  ]
}

PENTING: HANYA JSON. Tidak boleh ada teks lain, tidak boleh ada markdown, tidak boleh ada penjelasan.`;

    const visionCompletion = await getGroqClient().chat.completions.create({
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.05
    });

    const extractedContent = visionCompletion.choices[0]?.message?.content || '{"answers":[]}';
    
    let extractedData;
    try {
      extractedData = JSON.parse(extractedContent);
    } catch (e) {
      console.error('❌ Failed to parse Vision response:', e);
      extractedData = { answers: [] };
    }

    const studentAnswers = extractedData.answers || [];

    // VALIDASI: Check if extraction was successful

    const unreadableCount = studentAnswers.filter((a: any) => a.student_answer?.toLowerCase?.() === 'tidak terbaca').length;
    const emptyCount = studentAnswers.length === 0;

    if (emptyCount || (unreadableCount === studentAnswers.length && studentAnswers.length > 0)) {
      return NextResponse.json({
        success: false,
        error: 'AI tidak bisa membaca jawaban dari foto',
        message: 'Pastikan foto jelas dan jawaban terlihat dengan jelas',
        hint: 'Coba upload ulang dengan foto yang lebih jelas atau terang'
      }, { status: 400 });
    }

    const extractedText = JSON.stringify(extractedData);

    // Step 2: Text - Koreksi jawaban
    
    const correctionPrompt = `Anda adalah korektor ujian profesional. Bandingkan jawaban siswa dengan kunci jawaban.

JAWABAN SISWA:
${JSON.stringify(studentAnswers, null, 2)}

KUNCI JAWABAN:
${JSON.stringify(answerKey, null, 2)}

ATURAN KOREKSI:
Untuk SETIAP soal:
1. Ambil student_answer dari JAWABAN SISWA
2. Ambil correct_answer dari KUNCI JAWABAN dengan nomor yang sama
3. Bandingkan (case-insensitive, trim spasi):
   - Jika SAMA → is_correct: true, score: max_score, comment: "Benar"
   - Jika BERBEDA → is_correct: false, score: 0, comment: "Salah. Jawaban benar: [correct_answer]"
   - Jika "tidak terbaca" → is_correct: false, score: 0, comment: "Tidak terbaca"
4. Hitung total_score dan max_total dari semua soal
5. Buat summary: "X dari Y benar (Z%). Kuat di: [topik]. Perlu latihan: [topik]"

PENTING - JANGAN PERNAH:
- Menyalin correct_answer sebagai student_answer
- Mengubah student_answer
- Menginferensikan jawaban yang tidak terbaca
- Membuat teks lain selain JSON

OUTPUT FORMAT (WAJIB JSON MURNI):
{
  "answers": [
    {"question_number": 1, "student_answer": "C", "correct_answer": "B", "is_correct": false, "score": 0, "max_score": 20, "comment": "Salah. Jawaban benar: B"},
    {"question_number": 2, "student_answer": "A", "correct_answer": "A", "is_correct": true, "score": 20, "max_score": 20, "comment": "Benar"}
  ],
  "total_score": 20,
  "max_total": 40,
  "summary": "1 dari 2 benar (50%). Perlu lebih cermat membaca soal."
}

HANYA JSON. Tidak ada markdown, tidak ada teks lain.`;

    const correctionCompletion = await getGroqClient().chat.completions.create({
      messages: [
        { role: 'system', content: CORRECTION_SYSTEM_PROMPT },
        { role: 'user', content: correctionPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const correctionContent = correctionCompletion.choices[0]?.message?.content || '{}';

    let correctionData;
    try {
      correctionData = JSON.parse(correctionContent);
    } catch (e) {
      console.error('❌ Failed to parse correction response:', e);
      correctionData = { answers: [], total_score: 0, max_total: 0, summary: 'Parse error' };
    }

    // Hitung confidence (pilihan ganda = lebih tinggi, ada yang tidak terbaca = lebih rendah)
    const hasUnreadable = studentAnswers.some((a: any) => a.student_answer?.toLowerCase?.() === 'tidak terbaca');
    const hasEssay = answerKey.some((q: any) => !['A', 'B', 'C', 'D', 'E'].includes(q.correct_answer?.toUpperCase?.()));
    let confidence = hasEssay ? 0.7 : 0.9;
    if (hasUnreadable) confidence -= 0.2;
    confidence = Math.max(0, Math.min(1, confidence));

    // Update submission
    const { error: updateErr } = await supabase.from('worksheet_submissions').update({
      extracted_text: extractedText,
      ai_correction: correctionData,
      score: correctionData.total_score,
      confidence
    }).eq('id', submissionId);

    if (updateErr) {
      console.error('❌ Update failed:', updateErr.message);
      throw updateErr;
    }

    return NextResponse.json({ 
      success: true, 
      correction: correctionData, 
      confidence,
      message: `Koreksi selesai. Score: ${correctionData.total_score}/${correctionData.max_total}`
    });
  } catch (err: any) {
    console.error('Worksheet correction error:', err.message);
    
    return NextResponse.json({ 
      error: err.message,
      message: 'Koreksi gagal. Coba lagi atau hubungi admin.'
    }, { status: 500 });
  }
}
