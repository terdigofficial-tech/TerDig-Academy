"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Oops!</h1>
        <p className="text-slate-600 mb-4">Terjadi kesalahan. Coba lagi nanti.</p>
        <button onClick={reset} className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition">
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
