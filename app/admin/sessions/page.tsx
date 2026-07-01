import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import SessionTableWithSearch from '@/components/SessionTableWithSearch';

export const revalidate = 0;

export default async function SessionsPage() {
  try {
    const supabase = createServerClient();
    
    // Get current user from cookie for role-based filtering
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    const currentUser = token ? await verifyToken(token) : null;
    
    let query = supabase
      .from('sessions')
      .select(`
        *,
        episodes (
          episode_number,
          title,
          terdig_level,
          roadmap_level
        ),
        users!tutor_id (
          id,
          username,
          full_name,
          role
        )
      `);

    // Tutor hanya bisa melihat session miliknya
    if (currentUser?.role === 'tutor') {
      query = query.eq('tutor_id', currentUser.sub);
    }

    const { data: sessions, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sessions:', error);
      throw error;
    }

    const userRole = currentUser?.role || 'admin';

    // Map data untuk komponen
    const sessionData = (sessions || []).map((session: any) => ({
      id: session.id,
      episode_id: session.episode_id,
      target_level: session.target_level ?? null,
      title: session.title,
      date: session.date,
      notes: session.notes,
      status: session.status,
      created_at: session.created_at,
      updated_at: session.updated_at,
      episode_number: session.episodes?.episode_number ?? null,
      episode_title: session.episodes?.title ?? '-',
      terdig_level: session.episodes?.terdig_level ?? '-',
      roadmap_level: session.episodes?.roadmap_level ?? null,
      tutor: session.users || session.tutor || null,
    }));

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Daftar Sesi</h2>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Sesi Baru
          </Link>
        </div>
        <SessionTableWithSearch sessions={sessionData} userRole={userRole} />
      </div>
    );
  } catch (err: any) {
    console.error('❌ Error in SessionsPage:', err.message);
    return (
      <div className="p-8 bg-red-50 rounded-lg border border-red-200">
        <h2 className="text-lg font-bold text-red-700 mb-2">Error Memuat Sesi</h2>
        <p className="text-red-600 text-sm">{err.message}</p>
        <p className="text-red-500 text-xs mt-2">Hubungi admin jika masalah berlanjut</p>
      </div>
    );
  }
}
