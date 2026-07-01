import mammoth from 'mammoth';
import * as fs from 'fs';

export async function parseDocx(filePath: string) {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split('\n').map(l => l.trim()).filter(Boolean);

  const metadata: Record<string, string> = {};
  const contentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('Judul:')) metadata.title = line.replace('Judul:', '').trim();
    else if (line.startsWith('Kelas:')) metadata.grade = line.replace('Kelas:', '').trim();
    else if (line.startsWith('Mata Pelajaran:')) metadata.subject = line.replace('Mata Pelajaran:', '').trim();
    else if (line.startsWith('Durasi:')) metadata.duration = line.replace('Durasi:', '').trim();
    else contentLines.push(line);
  }

  return { metadata, raw_text: contentLines.join('\n') };
}
