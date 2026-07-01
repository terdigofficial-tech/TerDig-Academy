"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Cookie httpOnly sudah di-set oleh server, redirect saja
        router.push(redirect);
      } else {
        const data = await res.json();
        setError(data.error || 'Username atau password salah');
      }
    } catch (err) {
      console.error('❌ Login fetch error:', err);
      setError('Terjadi kesalahan. Coba lagi.');
    }

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <div className="text-center mb-6">
        <img src="/logo.png" alt="TerDig Academy" className="w-16 h-16 object-contain mx-auto mb-3 rounded-xl" />
        <h1 className="text-2xl font-bold text-slate-800">TerDig Academy</h1>
        <p className="text-slate-500 text-sm mt-1">Masuk ke Management System</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          className="w-full bg-white text-black border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-400"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          disabled={loading}
          autoComplete="username"
        />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full bg-white text-black border rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-400"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Memverifikasi...
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
