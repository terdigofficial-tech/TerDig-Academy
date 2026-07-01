'use client';

import type { RubricCriteria } from '@/types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface RubricEditorProps {
  value: RubricCriteria[];
  onChange: (rubric: RubricCriteria[]) => void;
}

export default function RubricEditor({ value, onChange }: RubricEditorProps) {
  const addCriteria = () => {
    onChange([...value, { name: '', max_score: 5 }]);
  };

  const removeCriteria = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof RubricCriteria, val: string | number) => {
    const updated = value.map((c, i) =>
      i === index ? { ...c, [field]: field === 'max_score' ? Number(val) : val } : c
    );
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Rubrik Penilaian
        </label>
        <button
          type="button"
          onClick={addCriteria}
          className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition flex items-center gap-1 font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Kriteria
        </button>
      </div>

      <div className="space-y-2">
        {value.map((criteria, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
          >
            <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 cursor-grab" />
            <div className="flex-1">
              <input
                type="text"
                value={criteria.name}
                onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                placeholder="Nama kriteria (contoh: Kerapian)"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400">Skor Maks</label>
              <input
                type="number"
                value={criteria.max_score}
                onChange={(e) => updateCriteria(index, 'max_score', parseInt(e.target.value) || 1)}
                min="1"
                max="100"
                className="w-20 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition text-center"
              />
            </div>
            <button
              type="button"
              onClick={() => removeCriteria(index)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {value.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          Belum ada kriteria. Klik "Tambah Kriteria" untuk mulai.
        </p>
      )}

      {value.length > 0 && (
        <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700/30 rounded-lg text-xs text-slate-600 dark:text-slate-400">
          Total {value.length} kriteria | Skor maksimal keseluruhan:{' '}
          <strong>{value.reduce((sum, c) => sum + c.max_score, 0)}</strong>
        </div>
      )}
    </div>
  );
}
