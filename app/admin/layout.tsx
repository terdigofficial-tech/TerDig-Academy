"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, CalendarClock, LogOut, FileText, School, Tag, Menu, X, Moon, Sun, Film, Users2, UserCog, Wallet, UserPlus, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import AdminErrorBoundary from '@/components/AdminErrorBoundary';
import { useTheme } from '@/components/ThemeProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'tutor' | null>(null);
  const [userName, setUserName] = useState('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Get user info from the auth cookie indirectly via a fetch
    fetch('/api/admin/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setUserRole(data.data.role);
          setUserName(data.data.full_name);
        }
      })
      .catch(() => {
        // Fallback: use cookie parsing
        setUserRole('admin');
      });
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const getMenuClass = (href: string) => {
    const baseClass = 'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200';
    const activeClass = 'bg-white/10 text-white font-medium';
    const inactiveClass = 'text-indigo-100 hover:bg-white/10 hover:text-white';
    return `${baseClass} ${isActive(href) ? activeClass : inactiveClass}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TerDig Academy" className="w-7 h-7 object-contain rounded-lg" />
          <h1 className="text-xl font-bold">TerDig Academy</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white flex flex-col shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-indigo-500/30 hidden lg:block shrink-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <img src="/logo.png" alt="TerDig Academy" className="w-8 h-8 object-contain rounded-lg" />
            TerDig Academy
          </h1>
          <p className="text-indigo-200 text-sm mt-1">Management System</p>
          {userName && (
            <p className="text-indigo-300 text-xs mt-2 truncate">
              {userName} {userRole === 'tutor' && <span className="bg-indigo-500/30 px-2 py-0.5 rounded-full text-[10px]">Tutor</span>}
            </p>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <Link href="/admin" className={getMenuClass('/admin')} onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/sessions" className={getMenuClass('/admin/sessions')} onClick={() => setSidebarOpen(false)}>
            <Calendar className="w-5 h-5" />
            Sesi
          </Link>
          <Link
            href="/admin/schedules"
            className={`${getMenuClass('/admin/schedules')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <CalendarClock className="w-5 h-5" />
            Jadwal Rutin
          </Link>
          <Link href="/admin/reports" className={getMenuClass('/admin/reports')} onClick={() => setSidebarOpen(false)}>
            <FileText className="w-5 h-5" />
            Laporan
          </Link>

          {/* Divider */}
          <div className={`border-t border-indigo-500/20 my-2 ${userRole === 'tutor' ? 'hidden' : ''}`} />

          {/* Admin-only menu items */}
          <Link
            href="/admin/episodes"
            className={`${getMenuClass('/admin/episodes')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Film className="w-5 h-5" />
            Episode
          </Link>
          <Link
            href="/admin/leads"
            className={`${getMenuClass('/admin/leads')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <UserPlus className="w-5 h-5" />
            Leads & Trial
          </Link>
          <Link
            href="/admin/students"
            className={`${getMenuClass('/admin/students')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Users className="w-5 h-5" />
            Siswa
          </Link>
          <Link
            href="/admin/parents"
            className={`${getMenuClass('/admin/parents')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Users2 className="w-5 h-5" />
            Orang Tua
          </Link>
          <Link
            href="/admin/grades"
            className={`${getMenuClass('/admin/grades')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <School className="w-5 h-5" />
            Kelas
          </Link>
          <Link
            href="/admin/programs"
            className={`${getMenuClass('/admin/programs')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Tag className="w-5 h-5" />
            Program
          </Link>
          <Link
            href="/admin/spp"
            className={`${getMenuClass('/admin/spp')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Wallet className="w-5 h-5" />
            SPP
          </Link>
          <Link
            href="/admin/broadcasts"
            className={`${getMenuClass('/admin/broadcasts')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Megaphone className="w-5 h-5" />
            Broadcast
          </Link>
          <Link
            href="/admin/users"
            className={`${getMenuClass('/admin/users')} ${userRole === 'tutor' ? 'hidden' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <UserCog className="w-5 h-5" />
            Users
          </Link>
        </nav>

        {/* Footer - TIDAK SCROLL */}
        <div className="shrink-0">
          <button
            onClick={toggleTheme}
            className="mx-4 mb-2 flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-100 hover:bg-white/10 hover:text-white transition-all duration-200 w-full text-left"
          >
            {theme === 'dark' ? (
              <><Sun className="w-5 h-5" /> Mode Terang</>
            ) : (
              <><Moon className="w-5 h-5" /> Mode Gelap</>
            )}
          </button>

          <button
            onClick={async () => {
              await fetch('/api/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="mx-4 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-100 hover:bg-white/10 hover:text-white transition-all duration-200 w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
          <div className="p-4 border-t border-indigo-500/30 text-xs text-indigo-300">
            © 2026 TerDig Academy. All rights reserved.
          </div>
        </div>
      </aside>

      {/* Overlay untuk mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="w-full lg:w-[calc(100vw-18rem)] lg:ml-72 min-h-screen p-4 md:p-8 overflow-x-hidden overflow-y-auto">
        <AdminErrorBoundary>
          {children}
        </AdminErrorBoundary>
      </main>
    </div>
  );
}
