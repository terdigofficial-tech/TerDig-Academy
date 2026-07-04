"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Search, X, Filter, ChevronDown, Calendar, BookOpen } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface SessionItem {
  id: string;
  episode_id: string;
  target_level: string | null;
  title: string;
  date: string;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  episode_number: number | null;
  episode_title: string;
  terdig_level: string;
  roadmap_level: number | null;
  tutor?: { id: string; username: string; full_name: string } | null;
}

interface TutorOption {
  id: string;
  username: string;
  full_name: string;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'Terjadwal', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  in_progress: { label: 'Berlangsung', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  completed: { label: 'Selesai', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  cancelled: { label: 'Dibatalkan', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

const STATUS_EMOJI: Record<string, string> = {
  scheduled: '📅',
  in_progress: '⚡',
  completed: '✅',
  cancelled: '❌',
};

const LEVEL_BADGES: Record<string, string> = {
  pemula: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  menengah: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  lanjut: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function getSortValue(session: SessionItem, key: string): string | number {
  switch (key) {
    case 'title': return session.title.toLowerCase();
    case 'episode_number': return session.episode_number ?? 0;
    case 'terdig_level': return session.terdig_level;
    case 'status': return session.status;
    case 'date': return session.date;
    default: return '';
  }
}

const LEVEL_OPTIONS = [
  { value: 'pemula', label: '🟢 Pemula' },
  { value: 'menengah', label: '🟡 Menengah' },
  { value: 'lanjut', label: '🔴 Lanjut' },
];

const LEVEL_BADGE_COLORS: Record<string, string> = {
  pemula: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  menengah: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  lanjut: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export default function SessionTableWithSearch({ sessions, userRole = 'admin' }: { sessions: SessionItem[]; userRole?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [tutorFilter, setTutorFilter] = useState<string>('all');
  const [tutors, setTutors] = useState<TutorOption[]>([]);

  // Fetch tutors for filter (admin only)
  useEffect(() => {
    if (userRole === 'admin') {
      fetch('/api/admin/users?role=tutor&status=active')
        .then(res => res.json())
        .then(data => setTutors(data.data || []))
        .catch(() => {});
    }
  }, [userRole]);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  }, [sortKey]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Filter by target level
    if (levelFilter !== 'all') {
      result = result.filter((s) => s.target_level === levelFilter);
    }

    // Filter by tutor (admin only)
    if (userRole === 'admin' && tutorFilter !== 'all') {
      if (tutorFilter === 'unassigned') {
        result = result.filter((s) => !s.tutor);
      } else {
        result = result.filter((s) => s.tutor?.id === tutorFilter);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const title = s.title.toLowerCase();
        const episodeTitle = s.episode_title.toLowerCase();
        const level = s.terdig_level.toLowerCase();
        const statusLabel = STATUS_LABELS[s.status]?.label.toLowerCase() || '';
        return title.includes(q) || episodeTitle.includes(q) || level.includes(q) || statusLabel.includes(q);
      });
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = getSortValue(a, sortKey);
        const bVal = getSortValue(b, sortKey);
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sessions, searchQuery, statusFilter, sortKey, sortDir]);

  const hasSearch = searchQuery.trim().length > 0;
  const hasFilter = statusFilter !== 'all' || levelFilter !== 'all';
  const isFiltered = hasSearch || hasFilter;

  const totalPages = Math.ceil(filteredSessions.length / PAGE_SIZE);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, currentPage]);

  const safePage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari sesi berdasarkan judul, episode, level, atau status..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {hasSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer min-w-[160px]"
          >
            <option value="all">Semua Level</option>
            {LEVEL_OPTIONS.map((lv) => (
              <option key={lv.value} value={lv.value}>{lv.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer min-w-[160px]"
          >
            <option value="all">Semua Status</option>
            <option value="scheduled">📅 Terjadwal</option>
            <option value="in_progress">⚡ Berlangsung</option>
            <option value="completed">✅ Selesai</option>
            <option value="cancelled">❌ Dibatalkan</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Filter by Tutor (Admin Only) */}
        {userRole === 'admin' && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={tutorFilter}
              onChange={(e) => {
                setTutorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer min-w-[160px]"
            >
              <option value="all">Semua Tutor</option>
              <option value="unassigned">❌ Unassigned</option>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('title')}>
                Judul Sesi {sortKey === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('episode_number')}>
                Episode {sortKey === 'episode_number' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap">
                Target Level
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('terdig_level')}>
                Level {sortKey === 'terdig_level' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('date')}>
                Tanggal {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              {userRole === 'admin' && (
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Tutor</th>
              )}
              <th className="px-6 py-4 font-semibold whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginatedSessions?.map((session) => {
              const statusInfo = STATUS_LABELS[session.status] || STATUS_LABELS.scheduled;
              const levelBadge = LEVEL_BADGES[session.terdig_level] || LEVEL_BADGES.pemula;
              return (
                <tr key={session.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{session.title}</span>
                        {session.notes && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{session.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                    EP-{session.episode_number != null ? String(session.episode_number).padStart(3, '0') : '???'}
                    <span className="block text-xs text-slate-400 dark:text-slate-500">{session.episode_title}</span>
                  </td>
                  <td className="px-6 py-4">
                    {session.target_level ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${LEVEL_BADGE_COLORS[session.target_level] || 'bg-slate-100 text-slate-600'}`}>
                        {session.target_level === 'pemula' ? '🟢' : session.target_level === 'menengah' ? '🟡' : '🔴'}
                        {session.target_level.charAt(0).toUpperCase() + session.target_level.slice(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${levelBadge}`}>
                      {session.terdig_level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                      <span>{STATUS_EMOJI[session.status] || '📅'}</span>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(session.date + 'T00:00:00').toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4">
                      {session.tutor ? (
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {session.tutor.full_name}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/sessions/${session.id}`}
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm transition"
                    >
                      <Settings className="w-4 h-4" />
                      Kelola
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!paginatedSessions || paginatedSessions.length === 0) && (
              <tr>
                <td colSpan={userRole === 'admin' ? 8 : 7} className="px-6 py-16 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {isFiltered ? 'Tidak ada sesi yang cocok' : 'Belum ada sesi'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {hasSearch
                      ? 'Coba gunakan kata kunci lain'
                      : 'Buat sesi baru dengan memilih episode yang sudah dipublikasikan'}
                  </p>
                </td>
              </tr>
            )}
          </tbody></table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredSessions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
