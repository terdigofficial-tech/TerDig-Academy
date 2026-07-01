import { createServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import MaterialTableWithSearch from '@/components/MaterialTableWithSearch';

export const revalidate = 0;

export default async function MaterialsPage() {
  const supabase = createServerClient();
  const { data: kits } = await supabase
    .from('production_kits')
    .select('id, status, created_at, modules(filename)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Daftar Materi</h2>
        <Link href="/admin/materials/upload" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium">
          + Upload Modul
        </Link>
      </div>
      <MaterialTableWithSearch kits={kits || []} />
    </div>
  );
}
