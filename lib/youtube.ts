/**
 * Mengkonversi berbagai format URL YouTube menjadi embed URL.
 */
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';

  // Format pendek: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  // Format panjang: youtube.com/watch?v=VIDEO_ID
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (longMatch) {
    return `https://www.youtube.com/embed/${longMatch[1]}`;
  }

  // Jika sudah dalam format embed atau tidak dikenali, kembalikan apa adanya
  return url;
}

/**
 * Format tanggal ke format DD/MM/YYYY.
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
