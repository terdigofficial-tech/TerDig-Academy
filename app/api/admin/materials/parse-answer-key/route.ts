import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function getGroqClient(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
}

const PARSE_SYSTEM_PROMPT = `Anda adalah asisten pendidikan profesional yang ahli mengekstrak soal dan kunci jawaban dari dokumen.
Tugas: Membaca teks dokumen soal, mengidentifikasi nomor soal, pilihan jawaban, dan kunci jawaban.
Output: JSON array yang akurat dan lengkap.`;

export async function POST(req: NextRequest) {
  try {
    console.log('=== PARSE ANSWER KEY API ===');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers));

    const formData = await req.formData();
    console.log('FormData entries:', Array.from(formData.entries()).map(([key, val]) => [key, val instanceof File ? `File(${val.name}, ${val.size} bytes)` : val]));
    
    const file = formData.get('file') as File;
    console.log('File received:', file ? `${file.name} (${file.size} bytes, type: ${file.type})` : 'null');
    
    if (!file) {
      console.error('❌ ERROR: File is null/undefined');
      return NextResponse.json({ error: 'File wajib dikirim dalam FormData' }, { status: 400 });
    }

    if (file.size === 0) {
      console.error('❌ ERROR: File is empty');
      return NextResponse.json({ error: 'File kosong (ukuran 0 bytes)' }, { status: 400 });
    }

    console.log('✓ File validation passed');

    // Ekstrak teks dari DOCX
    console.log('Starting DOCX extraction...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer created:', buffer.length, 'bytes');
    
    const tempPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    console.log('Temp path:', tempPath);
    
    fs.writeFileSync(tempPath, buffer);
    console.log('✓ File written to temp');
    
    const result = await mammoth.extractRawText({ path: tempPath });
    console.log('✓ Mammoth extraction result:', {
      textLength: result.value?.length || 0,
      messages: result.messages || [],
      hasWarnings: (result.messages || []).length > 0
    });
    
    fs.unlinkSync(tempPath);
    console.log('✓ Temp file deleted');
    
    const rawText = result.value?.trim() || '';
    console.log('Raw text length:', rawText.length);
    console.log('First 200 chars:', rawText.substring(0, 200));

    if (!rawText) {
      console.error('❌ ERROR: Extracted text is empty');
      return NextResponse.json({ 
        error: 'File kosong atau tidak terbaca. Pastikan DOCX valid dan berisi teks.' 
      }, { status: 400 });
    }

    console.log('✓ Text extraction passed');

    // AI parsing soal & jawaban - ATTEMPT 1
    console.log('Starting Groq parsing (Attempt 1)...');
    const prompt1 = `Anda adalah asisten pendidikan profesional. Baca teks berikut yang berisi soal pilihan ganda dan kunci jawaban.

STRUKTUR DOKUMEN:
- Bagian SOAL: Berisi nomor soal (1, 2, 3, ...) diikuti pertanyaan
- Setiap soal memiliki 4 pilihan jawaban berlabel A, B, C, D
- Bagian KUNCI JAWABAN: Berisi jawaban untuk setiap nomor soal (misalnya: 1=B, 2=A, 3=C)

TUGAS:
1. Cari semua soal di bagian atas (setelah kata "SOAL" atau nomor soal)
2. Cari kunci jawaban di bagian bawah (setelah kata "KUNCI JAWABAN" atau "JAWABAN")
3. Cocokkan nomor soal dengan jawabannya

OUTPUT HANYA JSON array, TANPA markdown, TANPA penjelasan tambahan:
[
  {"question_number":1,"type":"pg","correct_answer":"B","max_score":20},
  {"question_number":2,"type":"pg","correct_answer":"A","max_score":20}
]

PENTING:
- question_number: nomor urut (1, 2, 3, ...)
- type: SELALU "pg" (pilihan ganda)
- correct_answer: HURUF SAJA (A, B, C, atau D) - jangan angka
- max_score: gunakan 20 sebagai default, atau cari di rubrik jika ada

Ekstrak SEMUA soal yang ada. Jangan skip atau hilangkan.

TEKS DOKUMEN:
${rawText}`;

    console.log('Prompt 1 length:', prompt1.length);

    let completion = await getGroqClient().chat.completions.create({
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: prompt1 }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.05
    });

    let content = completion.choices[0]?.message?.content || '[]';
    console.log('✓ Groq response received (Attempt 1)');
    console.log('Response length:', content.length);
    console.log('First 300 chars:', content.substring(0, 300));

    // Parse respons - Attempt 1
    let questions: any[] = [];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      console.log('✓ JSON parsed successfully');
      console.log('Questions extracted:', questions.length);
    } catch (e) {
      console.error('❌ JSON parse error on Attempt 1:', e);
      console.log('Raw response:', content);
      questions = [];
    }

    // FALLBACK: Attempt 2 dengan prompt berbeda jika Attempt 1 gagal
    if (questions.length === 0) {
      console.log('⚠️ Attempt 1 failed, trying Attempt 2...');
      
      const prompt2 = `Ekstrak soal pilihan ganda dari teks berikut. Format output: JSON array sederhana.

Contoh output:
[
  {"question_number":1,"type":"pg","correct_answer":"A","max_score":20},
  {"question_number":2,"type":"pg","correct_answer":"B","max_score":20}
]

Teks:
${rawText}`;

      console.log('Starting Groq parsing (Attempt 2)...');
      completion = await getGroqClient().chat.completions.create({
        messages: [
          { role: 'system', content: PARSE_SYSTEM_PROMPT },
          { role: 'user', content: prompt2 }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.05
      });

      content = completion.choices[0]?.message?.content || '[]';
      console.log('✓ Groq response received (Attempt 2)');
      console.log('Response length:', content.length);
      console.log('First 300 chars:', content.substring(0, 300));

      try {
        const parsed = JSON.parse(content);
        questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        console.log('✓ JSON parsed successfully (Attempt 2)');
        console.log('Questions extracted:', questions.length);
      } catch (e) {
        console.error('❌ JSON parse error on Attempt 2:', e);
        console.log('Raw response:', content);
        questions = [];
      }
    }

    // FALLBACK: Jika masih gagal, return rawText + error informatif
    if (questions.length === 0) {
      console.warn('⚠️ WARNING: Both parsing attempts failed');
      return NextResponse.json({ 
        success: false,
        error: 'Parsing AI gagal mengekstrak soal dari format dokumen ini',
        message: 'Silakan isi kunci jawaban secara manual atau coba format DOCX yang berbeda',
        extractedText: rawText.substring(0, 500),
        hint: 'Format DOCX harus memiliki bagian SOAL (dengan nomor dan pilihan A-D) dan KUNCI JAWABAN'
      }, { status: 200 });
    }

    console.log('✅ SUCCESS: Parsing completed');
    console.log('Final result:', {
      questionsCount: questions.length,
      firstQuestion: questions[0],
      lastQuestion: questions[questions.length - 1]
    });
    
    return NextResponse.json({ 
      success: true, 
      questions,
      message: `✅ ${questions.length} soal berhasil di-parsing`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('❌ ERROR in parse endpoint:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return NextResponse.json({ 
      success: false,
      error: `Error: ${err.message}`,
      details: err.message,
      message: 'Terjadi error saat memproses file. Cek koneksi API Groq atau coba lagi.'
    }, { status: 500 });
  }
}
