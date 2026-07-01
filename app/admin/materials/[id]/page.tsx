import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CheckCircle, Image, Mic, Film, ChevronDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AnswerKeyEditor from '../AnswerKeyEditor';

export const revalidate = 0;

async function markReady(id: string) {
  "use server";
  const supabase = createServerClient();
  await supabase.from('production_kits').update({ status: 'ready' }).eq('id', id);
  revalidatePath(`/admin/materials/${id}`);
}

async function saveAnswerKey(id: string, formData: FormData) {
  "use server";
  const answerKeyStr = formData.get('answer_key') as string;
  if (!answerKeyStr) return;
  const supabase = createServerClient();
  try {
    await supabase.from('production_kits').update({ answer_key: JSON.parse(answerKeyStr) }).eq('id', id);
    revalidatePath(`/admin/materials/${id}`);
  } catch (err) {
    console.error('Error saving answer key:', err);
    throw err;
  }
}

export default async function KitEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: kit } = await supabase
    .from('production_kits')
    .select('*, modules(filename, metadata)')
    .eq('id', id)
    .single();

  if (!kit) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/materials" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition">
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
      </Link>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{kit.modules?.filename}</h2>
        <div className="flex items-center gap-3 mt-2">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            kit.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <CheckCircle className="w-4 h-4" />
            {kit.status === 'ready' ? 'Siap Produksi' : 'Draft'}
          </span>
          {kit.modules?.metadata && (
            <span className="text-sm text-slate-700">
              {kit.modules.metadata.grade} • {kit.modules.metadata.subject}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {kit.scenes.map((scene: any, i: number) => (
          <details key={i} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 list-none">
              <div className="flex items-center gap-4">
                <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg text-sm">Scene {scene.scene_number}</span>
                <span className="font-semibold text-slate-700">{scene.title}</span>
                <span className="text-xs text-slate-600">{scene.duration_min} menit</span>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-6 pb-6 space-y-4 animate-in fade-in">
              <div className="bg-indigo-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-indigo-700 font-medium mb-2">
                  <Image className="w-4 h-4" /> Image Prompt
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.image_prompt}</p>
              </div>
              {scene.motion_prompt && (
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-purple-700 font-medium mb-2">
                  <Film className="w-4 h-4" /> Motion Prompt (Image-to-Video)
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.motion_prompt}</p>
              </div>
              )}
              <div className="bg-amber-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                  <Mic className="w-4 h-4" /> Voice Script
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.voice_script}</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-rose-700 font-medium mb-2">
                  <Film className="w-4 h-4" /> CapCut Note
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.capcut_note}</p>
              </div>
              {scene.transition && (
              <div className="bg-teal-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-teal-700 font-medium mb-2">
                  <Film className="w-4 h-4" /> Transisi
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.transition}</p>
              </div>
              )}
              {scene.sound_effect && (
              <div className="bg-orange-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                  <Film className="w-4 h-4" /> Efek Suara
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.sound_effect}</p>
              </div>
              )}
              {scene.character && (
              <div className="bg-cyan-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-cyan-700 font-medium mb-2">
                  <Image className="w-4 h-4" /> Karakter
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.character}</p>
              </div>
              )}
              {scene.background_setting && (
              <div className="bg-emerald-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
                  <Image className="w-4 h-4" /> Latar Setting
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{scene.background_setting}</p>
              </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {/* Answer Key Editor */}
      <AnswerKeyEditor
        kitId={kit.id}
        initialValue={kit.answer_key}
        onSave={saveAnswerKey.bind(null, kit.id)}
      />

      <div className="mt-8 flex justify-end">
        <form action={markReady.bind(null, kit.id)}>
          <button className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition font-medium flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Tandai Siap Produksi
          </button>
        </form>
      </div>
    </div>
  );
}
