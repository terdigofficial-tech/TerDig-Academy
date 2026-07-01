"use client";

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2, AlertTriangle } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const RADIAN = Math.PI / 180;

function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  ) : null;
}

interface ChartData {
  attendanceTrend: { label: string; hadir: number; total: number; persentase: number }[];
  levelDistribution: { level: number; count: number }[];
  reportStatus: { name: string; value: number }[];
  gradeDistribution: { name: string; count: number }[];
}

export default function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard/charts')
      .then(res => res.json())
      .then(res => {
        if (res.error) throw new Error(res.error);
        setData(res);
      })
      .catch(err => {
        console.error('Error fetching chart data:', err);
        setError('Gagal memuat data grafik');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="h-[250px] bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-8 space-y-6">
      <h3 className="text-xl font-bold text-slate-800 dark:text-white">📊 Visualisasi Data</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend — Line Chart */}
        <ChartCard title="📈 Tren Kehadiran (7 Hari)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: any) => [`${value ?? 0}%`, 'Kehadiran']}
              />
              <Line
                type="monotone"
                dataKey="persentase"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Level Distribution — Bar Chart */}
        <ChartCard title="📊 Distribusi Level Siswa">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.levelDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="level" tick={{ fontSize: 12, fill: '#64748b' }} label={{ value: 'Level', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: any) => [value ?? 0, 'Siswa']}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={50}>
                {data.levelDistribution.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Report Status — Pie Chart */}
        <ChartCard title="📝 Status Laporan">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.reportStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={renderCustomizedLabel}
              >
                {data.reportStatus.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: any, name: any) => [value ?? 0, name]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Grade Distribution — Bar Chart */}
        <ChartCard title="🏫 Siswa per Kelas">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.gradeDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: any) => [value ?? 0, 'Siswa']}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={30}>
                {data.gradeDistribution.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{title}</p>
      {children}
    </div>
  );
}
