'use client';

interface YouTubePreviewProps {
  url: string;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function YouTubePreview({ url }: YouTubePreviewProps) {
  if (!url) return null;

  const videoId = getYouTubeId(url);
  if (!videoId) {
    return (
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          ⚠️ URL YouTube tidak valid. Pastikan formatnya: https://youtube.com/watch?v=xxx atau https://youtu.be/xxx
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
          Buka link &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
