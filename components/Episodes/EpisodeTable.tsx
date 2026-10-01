'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, Edit2, Trash2, Eye, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import type { Episode } from '@/types';
import Pagination from '@/components/Pagination';
import StatusBadge from './StatusBadge';
import LevelBadge from './LevelBadge';
import { TableSkeleton } from '@/components/Skeleton';

interface EpisodeTableProps {
  episodes: Episode[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
  onSearch: (query: string) => void;
  onFilter: (filters: FilterState) => void;
  activeFilters: FilterState;
}

export interface FilterState {
  terdig_level: string;
  roadmap_level: string;
  status: string;
}

function getFase(episodeNumber: number): string {
  // Penomoran global kurikulum: Fase A = 1-60 (60 ep), Fase B = 61-132 (72 ep), Fase C = 133+
  if (episodeNumber >= 1 && episodeNumber <= 60) return 'A';
  if (episodeNumber >= 61 && episodeNumber <= 132) return 'B';
  if (episodeNumber >= 133) return 'C';
  return '-';
}

const FASE_COLORS: Record<string, string> = {
  A: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  B: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  C: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function EpisodeTable({
  episodes,
  total,
  page,
  pageSize,
  totalPages,
  loading,
  onPageChange,
  onDelete,
  onSearch,
  onFilter,
  activeFilters,
}: EpisodeTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const [sortKey, setSortKey] = useState('episode_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSearch = () => {
    onSearch(searchInput);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-1" />;
  };

  const getSortClass = (columnKey: string) => {
    const base = 'px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none text-xs uppercase tracking-wider';
    return base;
  };

  if (loading && episodes.length === 0) {
    return (
      <div>
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  return (
    <div>
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari episode berdasarkan judul..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value) onSearch('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); onSearch(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Filter: Level */}
        <select
          value={activeFilters.terdig_level}
          onChange={(e) => onFilter({ ...activeFilters, terdig_level: e.target.value })}
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
        >
          <option value="">Semua Level</option>
          <option value="pemula">Pemula</option>
          <option value="menengah">Menengah</option>
          <option value="lanjut">Lanjut</option>
        </select>

        {/* Filter: Roadmap Level */}
        <select
          value={activeFilters.roadmap_level}
          onChange={(e) => onFilter({ ...activeFilters, roadmap_level: e.target.value })}
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
        >
          <option value="">Semua Roadmap</option>
          {[1, 2, 3, 4, 5].map((l) => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>

        {/* Filter: Status */}
        <select
          value={activeFilters.status}
          onChange={(e) => onFilter({ ...activeFilters, status: e.target.value })}
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
        >
          <option value="">Semua Status</option>
          <option value="not_started">Belum Dimulai</option>
          <option value="in_progress">Dalam Progres</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
            <tr>
              <th className={`${getSortClass('episode_number')} whitespace-nowrap`} onClick={() => handleSort('episode_number')}>
                No. Episode <SortIcon columnKey="episode_number" />
              </th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Fase</th>
              <th className={`${getSortClass('title')} whitespace-nowrap`} onClick={() => handleSort('title')}>
                Judul <SortIcon columnKey="title" />
              </th>
              <th className={`${getSortClass('terdig_level')} whitespace-nowrap`} onClick={() => handleSort('terdig_level')}>
                Level <SortIcon columnKey="terdig_level" />
              </th>
              <th className={`${getSortClass('roadmap_level')} whitespace-nowrap`} onClick={() => handleSort('roadmap_level')}>
                Roadmap <SortIcon columnKey="roadmap_level" />
              </th>
              <th className={`${getSortClass('status')} whitespace-nowrap`} onClick={() => handleSort('status')}>
                Status <SortIcon columnKey="status" />
              </th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Durasi</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {episodes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Tidak ada episode</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {searchInput || activeFilters.terdig_level || activeFilters.status
                      ? 'Coba reset filter atau gunakan kata kunci lain'
                      : 'Belum ada episode. Klik "Tambah Episode" untuk mulai.'}
                  </p>
                </td>
              </tr>
            ) : (
              episodes.map((episode) => (
                <tr key={episode.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      EP-{String(episode.episode_number).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FASE_COLORS[getFase(episode.episode_number)] || 'bg-slate-100 text-slate-600'}`}>
                      Fase {getFase(episode.episode_number)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{episode.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <LevelBadge level={episode.terdig_level} />
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                    Level {episode.roadmap_level}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={episode.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {episode.duration_minutes ? `${episode.duration_minutes} menit` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/episodes/${episode.id}`}
                        className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => onDelete(episode.id)}
                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody></table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
