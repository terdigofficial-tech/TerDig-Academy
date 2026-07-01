"use client";

import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface AnswerKeyEditorProps {
  kitId: string;
  initialValue?: any[];
  onSave: (formData: FormData) => Promise<void>;
}

export default function AnswerKeyEditor({ kitId, initialValue, onSave }: AnswerKeyEditorProps) {
  const [questions, setQuestions] = useState(initialValue || []);
  const [uploading, setUploading] = useState(false);
  const [answerKeyText, setAnswerKeyText] = useState(JSON.stringify(initialValue, null, 2) || '');

  const handleUploadDocx = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) {
        console.log('No file selected');
        return;
      }
      
      console.log('File selected:', file.name, file.size, 'bytes');
      
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('FormData created, keys:', Array.from(formData.keys()));
      
      try {
        console.log('Sending to /api/admin/materials/parse-answer-key...');
        const res = await fetch('/api/admin/materials/parse-answer-key', {
          method: 'POST',
          body: formData
        });
        
        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Response data:', data);
        
        // Handle sukses parsing
        if (data.success && data.questions?.length > 0) {
          setQuestions(data.questions);
          const jsonStr = JSON.stringify(data.questions, null, 2);
          setAnswerKeyText(jsonStr);
          toast.success(`✅ ${data.questions.length} soal berhasil diparsing dari DOCX`);
          console.log('✅ Parsing successful, questions:', data.questions);
        } 
        // Handle parsing gagal tapi file valid
        else if (!data.success && data.extractedText) {
          console.warn('⚠️ Parsing failed, showing extracted text');
          toast.error(data.message || data.error);
          setAnswerKeyText(`// Parsing AI gagal. Teks yang diekstrak:\n// Silakan isi manual atau coba format DOCX berbeda.\n\n/*\n${data.extractedText}\n*/\n\n[]`);
          console.log('Extracted text:', data.extractedText);
        }
        // Handle error
        else {
          console.error('❌ API error:', data);
          toast.error(data.error || data.message || 'Gagal parsing file');
          if (data.rawText) {
            console.log('Raw text from server:', data.rawText.substring(0, 200));
          }
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        toast.error(err.message || 'Network error');
      }
      
      setUploading(false);
    };
    input.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate JSON
      JSON.parse(answerKeyText);
      
      const formData = new FormData();
      formData.append('answer_key', answerKeyText);
      
      await onSave(formData);
      toast.success('✅ Kunci jawaban tersimpan');
    } catch (err: any) {
      toast.error(err.message || 'Format JSON tidak valid');
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">🔑 Kunci Jawaban</h3>
        
        {/* Upload DOCX Button */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={handleUploadDocx}
            disabled={uploading}
            className="text-sm bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-2 font-medium transition"
          >
            {uploading ? '⏳ Memproses...' : '📄 Upload Soal & Jawaban (DOCX)'}
          </button>
          <span className="text-xs text-slate-400">atau isi manual di bawah</span>
        </div>

        {/* Quick Preview */}
        {questions.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-800">
              📊 {questions.length} soal terdeteksi:
              {questions.map((q: any) => (
                <span key={q.question_number} className="inline-block ml-2">
                  No.{q.question_number} ({q.type === 'pg' ? '🔤 PG' : '📝 Esai'})
                </span>
              ))}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave}>
          <textarea
            name="answer_key"
            value={answerKeyText}
            onChange={(e) => setAnswerKeyText(e.target.value)}
            className="w-full border rounded-xl p-4 text-sm text-slate-800 font-mono"
            rows={14}
            placeholder={`Contoh format JSON:\n[\n  {"question_number":1,"type":"pg","correct_answer":"A","max_score":10},\n  {"question_number":2,"type":"esai","correct_answer":"Jawaban esai...","max_score":15}\n]`}
          />
          
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 text-sm font-medium transition"
            >
              💾 Simpan Kunci Jawaban
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Format: JSON array dengan question_number, type, correct_answer, max_score
            </p>
          </div>
        </form>

        {/* Field Guide */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
          <p><strong>question_number:</strong> nomor urut soal (1, 2, 3, ...)</p>
          <p><strong>type:</strong> "pg" (pilihan ganda) atau "esai" (uraian)</p>
          <p><strong>correct_answer:</strong> untuk PG: huruf/angka (A, B, C, D, E), untuk esai: jawaban lengkap</p>
          <p><strong>max_score:</strong> skor maksimal (default: 10 untuk PG, 15-20 untuk esai)</p>
        </div>
      </div>
    </>
  );
}
