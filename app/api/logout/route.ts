import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Hapus cookie JWT
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // langsung expired
  });

  // Hapus juga cookie lama (admin_auth) untuk kompatibilitas
  response.cookies.set('admin_auth', '', { maxAge: 0, path: '/' });

  console.log('✓ Admin logout berhasil');
  return response;
}
