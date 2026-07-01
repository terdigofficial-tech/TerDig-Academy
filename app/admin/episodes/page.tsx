'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import EpisodeTable, { type FilterState } from '@/components/Episodes/EpisodeTable';
import type { Episode } from '@/types';

export default function EpisodesPage() {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    terdig_level: '',
    roadmap_level: '',
    status: '',
  });

  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (search) params.set('search', search);
      if (filters.terdig_level) params.set('terdig_level', filters.terdig_level);
      if (filters.roadmap_level) params.set('roadmap_level', filters.roadmap_level);
      if (filters.status) params.set('status', filters.status);

      const res = await fetch(`/api/admin/episodes?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat data');

      const data = await res.json();
      setEpisodes(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      console.error('Error fetching episodes:', err);
      toast.error('Gagal memuat episode');
    }
    setLoading(false);
  }, [page, search, filters]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus episode ini? Data tidak bisa dikembalikan.')) return;

    try {
      const res = await fetch(`/api/admin/episodes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Episode berhasil dihapus');
        fetchEpisodes();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menghapus');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleFilter = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Episode Manager</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola 180 episode untuk semua fase (A, B, C) TerDig Academy
          </p>
        </div>
        <Link
          href="/admin/episodes/new"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Episode
        </Link>
      </div>

      <EpisodeTable
        episodes={episodes}
        total={total}
        page={page}
        pageSize={20}
        totalPages={totalPages}
        loading={loading}
        onPageChange={handlePageChange}
        onDelete={handleDelete}
        onSearch={handleSearch}
        onFilter={handleFilter}
        activeFilters={filters}
      />
    </div>
  );
}
