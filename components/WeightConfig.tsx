'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function WeightConfig() {
  const [weightObservation, setWeightObservation] = useState(50);
  const [weightWorksheet, setWeightWorksheet] = useState(50);
  const [isSaved, setIsSaved] = useState(true);
  const [loading, setLoading] = useState(true);

  // Load bobot dari database via API saat mount
  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          const obs = parseInt(data.settings?.weight_observation);
          const ws = parseInt(data.settings?.weight_worksheet);
          if (!isNaN(obs) && obs >= 0 && obs <= 100) {
            setWeightObservation(obs);
            setWeightWorksheet(100 - obs);
          }
          if (!isNaN(ws) && ws >= 0 && ws <= 100) {
            setWeightObservation(100 - ws);
            setWeightWorksheet(ws);
          }
        }
      } catch (err) {
        console.error('Gagal memuat bobot:', err);
      }
      setLoading(false);
    };
    fetchWeights();
  }, []);

  const handleObservationChange = (val: number) => {
    const newWs = 100 - val;
    setWeightObservation(val);
    setWeightWorksheet(newWs);
    setIsSaved(false);
  };

  const handleWorksheetChange = (val: number) => {
    const newObs = 100 - val;
    setWeightObservation(newObs);
    setWeightWorksheet(val);
    setIsSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simpan observasi & worksheet secara paralel
      const [obsRes, wsRes] = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'weight_observation', value: weightObservation }),
        }),
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'weight_worksheet', value: weightWorksheet }),
        })
      ]);

      if (!obsRes.ok || !wsRes.ok) {
        throw new Error('Gagal menyimpan salah satu bobot');
      }

      setIsSaved(true);
      toast.success(`Bobot disimpan: Observasi ${weightObservation}%, Lembar Kerja ${weightWorksheet}%`);
    } catch (err) {
      console.error('Gagal menyimpan bobot:', err);
      toast.error('Gagal menyimpan bobot ke database');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">⚙️ Konfigurasi Bobot Penilaian</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bobot Observasi */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Bobot Observasi (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={weightObservation}
              onChange={(e) => handleObservationChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-2xl font-bold text-indigo-600 w-12 text-right">{weightObservation}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Nilai dari penilaian tutor (analisis, komparasi, evaluasi)</p>
        </div>

        {/* Bobot Lembar Kerja */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Bobot Lembar Kerja (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={weightWorksheet}
              onChange={(e) => handleWorksheetChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-2xl font-bold text-purple-600 w-12 text-right">{weightWorksheet}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Nilai dari koreksi lembar kerja (AI atau manual)</p>
        </div>
      </div>

      {/* Total Check */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-700">
          Total: <span className="font-bold">{weightObservation + weightWorksheet}%</span>
          {weightObservation + weightWorksheet === 100 ? (
            <span className="text-green-600 ml-2">✓ Valid</span>
          ) : (
            <span className="text-red-600 ml-2">✗ Harus 100%</span>
          )}
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaved || weightObservation + weightWorksheet !== 100}
        className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
      >
        {isSaved ? '✓ Tersimpan' : '💾 Simpan Bobot'}
      </button>
    </div>
  );
}
