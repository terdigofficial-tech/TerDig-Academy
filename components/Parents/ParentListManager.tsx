"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Search, UserPlus, Phone, Edit3, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface StudentWithParent {
  id: string;
  full_name: string;
  parent_name: string | null;
  parent_phone: string | null;
  grade_id: string | null;
  status: string;
  gradeName?: string;
}

interface ParentListManagerProps {
  students: StudentWithParent[];
}

export default function ParentListManager({ students: initialStudents }: ParentListManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter: hanya siswa yang punya parent_phone + sesuai search
  const filtered = initialStudents.filter((s) => {
    if (!s.parent_phone) return false; // Hanya yang punya data ortu
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.parent_name || '').toLowerCase().includes(q) ||
      (s.parent_phone || '').includes(q)
    );
  });

  // Hitung statistik
  const totalWithParent = initialStudents.filter(s => s.parent_phone).length;
  const totalWithoutParent = initialStudents.filter(s => !s.parent_phone).length;

  return (
    <div>
      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-green-600 dark:text-green-400 font-medium">
          ✅ {totalWithParent} siswa punya data orang tua
        </span>
        {totalWithoutParent > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            ⚠️ {totalWithoutParent} siswa belum
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          placeholder="Cari nama siswa atau orang tua..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          {searchQuery ? (
            <p>Tidak ditemukan data dengan kata kunci "{searchQuery}"</p>
          ) : (
            <div>
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400">Belum ada data orang tua</p>
              <p className="text-xs text-slate-300 mt-1">
                Data orang tua diisi di halaman edit siswa masing-masing
              </p>
            </div>
          )}
        </div>
      )}

      {/* Student Cards */}
      <div className="space-y-3">
        {filtered.map((student) => (
          <div
            key={student.id}
            className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 p-4 transition-colors hover:border-slate-200 dark:hover:border-slate-600"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {student.full_name}
                  </span>
                  {student.gradeName && (
                    <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                      {student.gradeName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {student.parent_phone}
                  </span>
                  {student.parent_name && (
                    <span>👤 {student.parent_name}</span>
                  )}
                </div>
              </div>

              {/* Action */}
              <Link
                href={`/admin/students/${student.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Siswa
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
