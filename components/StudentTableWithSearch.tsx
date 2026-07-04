"use client";

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Users, Plus, Edit2, Search, X, Filter, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface Student {
  id: string;
  full_name: string;
  current_level: number;
  parent_name: string;
  parent_phone: string;
  status: string;
  sessionCount: number;
  isReady: boolean;
  gradeName: string;
  programName: string;
}

interface Props {
  students: Student[];
}

function getSortValue(s: Student, key: string): string | number {
  switch (key) {
    case 'full_name': return s.full_name.toLowerCase();
    case 'current_level': return s.current_level;
    case 'gradeName': return (s.gradeName || '').toLowerCase();
    case 'programName': return (s.programName || '').toLowerCase();
    case 'sessionCount': return s.sessionCount;
    case 'parent_name': return (s.parent_name || '').toLowerCase();
    case 'parent_phone': return (s.parent_phone || '');
    case 'status': return s.status;
    default: return '';
  }
}

export default function StudentTableWithSearch({ students }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
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

  // Debounce search — filter case-insensitive
  const filteredStudents = useMemo(() => {
    let result = students;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.parent_name?.toLowerCase().includes(q) ||
          s.parent_phone?.includes(q) ||
          s.gradeName?.toLowerCase().includes(q) ||
          s.programName?.toLowerCase().includes(q)
        );
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
  }, [students, searchQuery, statusFilter, sortKey, sortDir]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setCurrentPage(1);
    },
    []
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const hasSearch = searchQuery.trim().length > 0;
  const hasFilter = statusFilter !== 'all';
  const isFiltered = hasSearch || hasFilter;
  const safePage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Daftar Siswa</h2>
        <Link
          href="/admin/students/add"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Siswa
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, wali, telepon, kelas, program..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl pl-11 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {hasSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer min-w-[140px]"
          >
            <option value="all">Semua Status</option>
            <option value="active">🟢 Aktif</option>
            <option value="inactive">🔴 Nonaktif</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('full_name')}>
                  Nama {sortKey === 'full_name' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('current_level')}>
                  Level {sortKey === 'current_level' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('gradeName')}>
                  Kelas {sortKey === 'gradeName' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('programName')}>
                  Program {sortKey === 'programName' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('sessionCount')}>
                  Progres Sesi {sortKey === 'sessionCount' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('parent_name')}>
                  Wali {sortKey === 'parent_name' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('parent_phone')}>
                  Telepon {sortKey === 'parent_phone' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                  Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 ml-1">↕</span>}
                </th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedStudents.map((s: any) => (
                <tr key={s.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{s.full_name}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">Level {s.current_level}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{s.gradeName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{s.programName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.sessionCount}/4</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.isReady ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.isReady ? '✓ Siap Naik' : 'Proses'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{s.parent_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{s.parent_phone}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/students/${s.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Link>
                      <button
                        onClick={async () => {
                          const newStatus = s.status === 'active' ? 'inactive' : 'active';
                          const label = newStatus === 'inactive' ? 'Nonaktifkan' : 'Aktifkan';
                          if (!confirm(`${label} siswa "${s.full_name}"? Data histori tetap aman.`)) return;
                          try {
                            const res = await fetch(`/api/admin/students/${s.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            if (res.ok) {
                              window.location.reload();
                            } else {
                              const data = await res.json();
                              alert(data.error || 'Gagal mengubah status');
                            }
                          } catch (err: any) {
                            alert('Network error: ' + err.message);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition ${
                          s.status === 'active'
                            ? 'text-amber-600 hover:text-amber-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {s.status === 'active' ? (
                          <><ToggleRight className="w-4 h-4" /> Nonaktifkan</>
                        ) : (
                          <><ToggleLeft className="w-4 h-4" /> Aktifkan</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-600 dark:text-slate-400">
                    {isFiltered ? 'Tidak ada siswa yang cocok dengan pencarian' : 'Belum ada siswa terdaftar'}
                  </td>
                </tr>
              )}
          </tbody></table>
      </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredStudents.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
