import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cari user berdasarkan username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Cek status user
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Akun Anda tidak aktif. Hubungi admin.' },
        { status: 403 }
      );
    }

    // Verifikasi password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Buat JWT token dengan role
    const token = await signToken({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    });

    // Set httpOnly cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 jam
    });

    console.log(`✅ Login berhasil: ${user.username} (${user.role})`);
    return response;
  } catch (err: any) {
    console.error('❌ Login error:', err.message);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
