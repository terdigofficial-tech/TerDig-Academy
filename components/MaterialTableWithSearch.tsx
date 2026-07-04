"use client";

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Edit3, Search, X, Filter, ChevronDown } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface KitModule {
  filename: string;
}

interface Material {
  id: string;
  status: string;
  created_at: string;
  modules: KitModule | KitModule[] | null;
}

function getFilename(kit: Material): string {
  if (!kit.modules) return '';
  if (Array.isArray(kit.modules)) return kit.modules[0]?.filename || '';
  return kit.modules.filename || '';
}

function getSortValue(kit: Material, key: string): string | number {
  switch (key) {
    case 'filename': return getFilename(kit).toLowerCase();
    case 'status': return kit.status;
    case 'created_at': return kit.created_at;
    default: return '';
  }
}

export default function MaterialTableWithSearch({ kits }: { kits: Material[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const filteredKits = useMemo(() => {
    let result = kits;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((kit) => kit.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((kit) => {
        const filename = getFilename(kit).toLowerCase();
        const status = kit.status === 'ready' ? 'ready' : 'draft';
        return filename.includes(q) || status.includes(q);
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
  }, [kits, searchQuery, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredKits.length / PAGE_SIZE);
  const paginatedKits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredKits.slice(start, start + PAGE_SIZE);
  }, [filteredKits, currentPage]);

  const hasSearch = searchQuery.trim().length > 0;
  const hasFilter = statusFilter !== 'all';
  const isFiltered = hasSearch || hasFilter;

  // Sync page jika filter mengakibatkan totalPages berkurang
  const safePage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari materi berdasarkan nama file..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer min-w-[140px]"
          >
            <option value="all">Semua Status</option>
            <option value="ready">✅ Ready</option>
            <option value="draft">📝 Draft</option>
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
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('filename')}>
                File {sortKey === 'filename' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition select-none whitespace-nowrap" onClick={() => handleSort('created_at')}>
                Tanggal {sortKey === 'created_at' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-slate-300 dark:text-slate-500 ml-1">↕</span>}
              </th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginatedKits?.map((kit) => (
              <tr key={kit.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">{getFilename(kit)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    kit.status === 'ready'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {kit.status === 'ready' ? '✅ Ready' : '📝 Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                  {new Date(kit.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/admin/materials/${kit.id}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition">
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {filteredKits.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {isFiltered ? 'Tidak ada materi yang cocok' : 'Belum ada materi'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {isFiltered ? 'Coba ubah filter atau kata kunci' : 'Upload modul pertama Anda'}
                  </p>
                </td>
              </tr>
            )}
          </tbody></table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredKits.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
