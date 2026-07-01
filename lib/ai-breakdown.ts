import Groq from 'groq-sdk';

function getGroqClient(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
}

const SYSTEM_PROMPT = `Anda adalah ahli materi edukasi SD dan sutradara animasi pendidikan. Tugas Anda adalah memecah materi pembelajaran menjadi scene-by-scene yang siap diproduksi menjadi video animasi interaktif untuk siswa SD.

PEDOMAN KUALITAS:
- Setiap scene harus memiliki SATU inti pembelajaran yang jelas
- Bahasa Indonesia yang ramah anak, natural, dan mudah dipahami
- Gambar (image_prompt) harus cocok untuk anak SD: ceria, warna pastel, gaya kartun flat
- Animasi (motion_prompt) harus jelas, tidak terlalu cepat, fokus pada gerakan yang mendukung pembelajaran
- Voice script alami seperti guru berbicara ke murid, 30-60 detik per scene
- Durasi total per scene 1-3 menit

KONSISTENSI KARAKTER & SETTING (WAJIB):
- Tentukan SATU karakter utama yang akan muncul di SEMUA scene (contoh: Bu Guru Rina, si beruang coklat Bimo, atau tokoh kartun konsisten lainnya)
- Karakter utama harus SAMA persis di setiap scene — nama, penampilan, dan perannya tidak boleh berubah
- Gunakan field "character" untuk mendeskripsikan karakter utama (nama, penampilan singkat, peran)
- Gunakan field "background_setting" untuk lokasi/waktu yang KONSISTEN di semua scene (contoh: "ruang kelas yang cerah dengan papan tulis", "taman bermain yang hijau")
- Setiap image_prompt harus menyertakan karakter utama dengan nama yang sama
- Bayangkan ini adalah film pendek dengan tokoh tetap — konsistensi visual adalah PRIORITAS`;

export async function generateScenes(rawText: string) {
  const userPrompt = `Pecah modul berikut menjadi scene-by-scene untuk video animasi interaktif.

Untuk SETIAP scene, hasilkan field-field berikut:

1. **image_prompt** — prompt untuk text-to-image generation
   Format: [Subject/karakter] + [Aktivitas/aksi] + [Latar/lingkungan sederhana] + [Gaya] + [Komposisi]
   Gaya: flat vector illustration, children's book style, bright pastel colors, clean white/simple background
   Contoh: "A cheerful cartoon teacher holding a giant number 5, standing in front of a clean whiteboard with math symbols, flat vector illustration, bright pastel colors, soft warm lighting, children's book style, centered composition"

2. **motion_prompt** — prompt untuk image-to-video (animasi dari gambar diam)
   Format: [Subjek yang bergerak] + [Jenis gerakan] + [Gerakan kamera] + [Durasi/kecepatan] + [Gaya animasi]
   Contoh: "Gentle zoom in on the number 5, subtle floating animation on the teacher's hand pointing, soft particle effects like confetti, static camera with slow pan, flat vector animation style, smooth 2D motion"

3. **voice_script** — naskah narasi (30-60 detik, natural Indonesia, seperti guru berbicara ke anak SD)

4. **capcut_note** — catatan editing untuk CapCut (timing, transisi, efek, overlay teks)

5. **transition** — transisi ke scene berikutnya (contoh: "fade to white 0.5s", "slide left 0.3s", "cross zoom")

6. **sound_effect** — efek suara pendukung scene (contoh: "gentle chime on number appearance", "soft whoosh on transition", "children laughing")

7. **character** — nama & deskripsi karakter utama yang muncul di scene ini (harus SAMA untuk semua scene)
   Contoh: "Bu Guru Rina — guru muda ramah, berkacamata, rambut panjang diikat, baju batik merah muda"

8. **background_setting** — deskripsi latar lokasi scene (konsisten antar scene)
   Contoh: "Ruang kelas SD yang cerah dengan papan tulis hijau, meja kayu, dan poster edukasi di dinding"

ATURAN PENTING:
- Output HANYA JSON valid, TANPA markdown, TANPA teks lain
- Setiap scene = 1 aktivitas/inti pembelajaran
- Duration_min: 1-3 menit per scene
- Gunakan bahasa Indonesia untuk voice_script, title, capcut_note
- motion_prompt dalam bahasa Inggris (untuk kompatibilitas tools video AI)
- image_prompt dalam bahasa Inggris (untuk kompatibilitas tools image AI)
- KARAKTER UTAMA HARUS SAMA di semua scene — nama karakter yang sama harus muncul di setiap image_prompt
- BACKGROUND SETTING HARUS KONSISTEN — lokasi yang sama di semua scene, hanya angle/sudut pandang yang boleh berubah

OUTPUT FORMAT:
{
  "scenes": [
    {
      "scene_number": 1,
      "title": "Pengenalan Angka 5",
      "duration_min": 2,
      "image_prompt": "Bu Guru Rina holding a giant number 5, standing in front of a classroom whiteboard with simple math, flat vector illustration, bright pastel colors, children's book style, centered composition",
      "motion_prompt": "Gentle zoom in on the number 5, subtle floating animation showing Rina pointing, soft particle confetti effect, static camera, smooth 2D motion, educational animation style",
      "voice_script": "Halo adik-adik! Hari ini kita akan belajar tentang angka 5. Lihatlah betapa menariknya angka ini!",
      "capcut_note": "Open with fade in 0.5s. Add text overlay 'Angka 5' top center. Background music soft piano. Transition: fade to white",
      "transition": "fade to white 0.5s",
      "sound_effect": "gentle chime when number appears",
      "character": "Bu Guru Rina — guru muda ramah, berkacamata, rambut panjang diikat, baju batik merah muda",
      "background_setting": "Ruang kelas SD yang cerah dengan papan tulis hijau, meja kayu, dan poster edukasi"
    }
  ]
}

MODUL:
${rawText}`;

  const completion = await getGroqClient().chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    temperature: 0.15
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  return parsed.scenes || [];
}
