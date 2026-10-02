import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Routes yang hanya bisa diakses admin (bukan tutor)
const ADMIN_ONLY_PAGES = [
  '/admin/episodes',
  '/admin/students',
  '/admin/parents',
  '/admin/grades',
  '/admin/programs',
  '/admin/materials',
  '/admin/users',
  '/admin/spp',
  '/admin/leads',
  '/admin/broadcasts',
];

const ADMIN_ONLY_API = [
  '/api/admin/episodes',
  '/api/admin/users',
  '/api/admin/grades',
  '/api/admin/programs',
  '/api/admin/settings',
  '/api/admin/materials',
  '/api/admin/worksheets',
  '/api/admin/parents',
  '/api/admin/invoices',
  '/api/admin/payments',
  '/api/admin/leads',
  '/api/admin/biweekly',
  '/api/admin/broadcasts',
];

function isAdminOnlyPath(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => pathname === pattern || pathname.startsWith(pattern + '/'));
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Jangan proteksi endpoint login/auth (biar bisa akses tanpa token)
  if (path === '/api/admin/auth') {
    return NextResponse.next();
  }

  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    const token = req.cookies.get('admin_token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const user = await verifyToken(token);
    
    if (!user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // === ROLE-BASED ACCESS CONTROL ===
    if (user.role === 'tutor') {
      // Cek apakah halaman/api ini admin-only
      const isAdminPage = isAdminOnlyPath(path, ADMIN_ONLY_PAGES);
      const isAdminApi = isAdminOnlyPath(path, ADMIN_ONLY_API);

      // Exception: episode dropdown boleh diakses tutor (untuk form create session)
      if (path === '/api/admin/episodes/dropdown') {
        return NextResponse.next();
      }

      if (isAdminApi) {
        // Return 403 untuk API admin-only
        return NextResponse.json(
          { error: 'Akses ditolak. Hanya admin yang bisa mengakses resource ini.' },
          { status: 403 }
        );
      }

      if (isAdminPage) {
        // Redirect ke dashboard untuk halaman admin-only
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
};
