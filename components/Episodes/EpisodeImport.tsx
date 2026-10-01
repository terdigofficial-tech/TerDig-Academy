'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  mapSheetRows,
  type Fase,
  type MappedRow,
  type InvalidRow,
} from '@/lib/episode-import';

interface EpisodeImportProps {
  onImported?: () => void;
  onClose?: () => void;
}

interface ImportResult {
  inserted: number;
  skipped: number[];
  failed: { episode_number: number; error: string }[];
}

// Pilihan bawaan mengikuti rencana peluncuran: Fase A Level 1-2 + Fase B Level 1 lebih dahulu.
const DEFAULT_SELECTED: Record<string, boolean> = { 'A-1': true, 'A-2': true, 'B-1': true };

export default function EpisodeImport({ onImported, onClose }: EpisodeImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<MappedRow[]>([]);
  const [invalid, setInvalid] = useState<InvalidRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({ ...DEFAULT_SELECTED });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { fase: Fase; level: number; count: number }>();
    for (const r of rows) {
      const key = `${r.fase}-${r.payload.roadmap_level}`;
      const cur = map.get(key) || { fase: r.fase, level: r.payload.roadmap_level, count: 0 };
      cur.count++;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) =>
      a.fase === b.fase ? a.level - b.level : a.fase.localeCompare(b.fase)
    );
  }, [rows]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selected[`${r.fase}-${r.payload.roadmap_level}`]),
    [rows, selected]
  );

  const handleFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const allMapped: MappedRow[] = [];
      const allInvalid: InvalidRow[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
        const { mapped, invalid: inv } = mapSheetRows(sheetName, aoa);
        allMapped.push(...mapped);
        allInvalid.push(...inv);
      }
      if (allMapped.length === 0) {
        toast.error('Tidak ada baris episode yang dikenali dari file ini');
      } else {
        toast.success(`${allMapped.length} episode terbaca dari ${workbook.SheetNames.length} sheet`);
      }
      setRows(allMapped);
      setInvalid(allInvalid);
      setSelected({ ...DEFAULT_SELECTED });
    } catch (err: any) {
      console.error('Gagal membaca file:', err);
      toast.error('Gagal membaca file. Pastikan formatnya .xlsx / .xls / .csv roadmap TerDig.');
    }
  };

  const handleImport = async () => {
    if (selectedRows.length === 0) {
      toast.error('Pilih minimal satu kelompok fase/level untuk diimpor');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/admin/episodes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodes: selectedRows.map((r) => r.payload) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impor gagal');
      setResult(data as ImportResult);
      if (data.inserted > 0) {
        toast.success(`${data.inserted} episode berhasil diimpor`);
        onImported?.();
      } else if ((data.skipped || []).length > 0) {
        toast('Semua episode terpilih sudah ada di database (dilewati)', { icon: 'ℹ️' });
      }
      if ((data.failed || []).length > 0) {
        toast.error(`${data.failed.length} episode gagal diimpor — lihat rincian di panel`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error saat impor');
    }
    setImporting(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Impor Episode dari Excel Roadmap
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unggah file roadmap (sheet A / B). Nomor episode otomatis mengikuti penomoran global:
            Fase A = 1–60, Fase B = 61–132, Fase C = 133+. Episode yang sudah ada akan dilewati, tidak ditimpa.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label="Tutup panel impor"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-2 border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-sm font-medium"
      >
        <Upload className="w-4 h-4" /> {fileName ? `Ganti file (${fileName})` : 'Pilih file roadmap (.xlsx)'}
      </button>

      {rows.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Pilih kelompok yang diimpor ({selectedRows.length} dari {rows.length} episode terbaca):
          </p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const key = `${g.fase}-${g.level}`;
              const checked = !!selected[key];
              return (
                <label
                  key={key}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition ${
                    checked
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={checked}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  Fase {g.fase} · Level {g.level} ({g.count} ep)
                </label>
              );
            })}
          </div>

          <button
            onClick={handleImport}
            disabled={importing || selectedRows.length === 0}
            className="mt-4 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            {importing ? 'Mengimpor…' : `Impor ${selectedRows.length} Episode Terpilih`}
          </button>
        </div>
      )}

      {invalid.length > 0 && (
        <div className="mt-4 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {invalid.length} baris tidak terbaca:
          </p>
          <ul className="list-disc ml-5 mt-1">
            {invalid.slice(0, 5).map((inv, i) => (
              <li key={i}>
                Sheet {inv.sheet} baris {inv.rowIndex}: {inv.reason}
              </li>
            ))}
            {invalid.length > 5 && <li>…dan {invalid.length - 5} baris lainnya</li>}
          </ul>
        </div>
      )}

      {result && (
        <div className="mt-4 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
          <p className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Hasil impor: {result.inserted} masuk
            {result.skipped.length > 0 && `, ${result.skipped.length} dilewati (sudah ada)`}
            {result.failed.length > 0 && `, ${result.failed.length} gagal`}
          </p>
          {result.failed.length > 0 && (
            <ul className="list-disc ml-5 mt-1 text-xs text-red-600 dark:text-red-400">
              {result.failed.slice(0, 5).map((f, i) => (
                <li key={i}>
                  Episode {f.episode_number}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
