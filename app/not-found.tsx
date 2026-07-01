import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
        <p className="text-slate-600 mb-6">Halaman tidak ditemukan</p>
        <Link href="/admin" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition inline-block">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
