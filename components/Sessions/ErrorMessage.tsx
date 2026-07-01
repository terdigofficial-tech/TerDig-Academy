import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ErrorMessage({ error }: { error: string }) {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2">Error</h2>
          <p className="text-red-600 dark:text-red-400 text-sm mb-6">{error}</p>
          <Link
            href="/admin/sessions"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition font-medium text-sm"
          >
            Kembali ke Daftar Sesi
          </Link>
        </div>
      </div>
    </div>
  );
}
