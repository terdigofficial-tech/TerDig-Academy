import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('users')
      .select('id, username, full_name, email, phone, role, status, created_at, updated_at')
      .order('full_name', { ascending: true });

    if (role) {
      query = query.ilike('role', role);
    }
    if (status) {
      query = query.ilike('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/users:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await req.json();
    const { username, password, full_name, email, phone, role } = body;

    if (!username || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Username, password, full_name, dan role wajib diisi' },
        { status: 400 }
      );
    }

    if (role !== 'admin' && role !== 'tutor') {
      return NextResponse.json(
        { error: 'Role harus admin atau tutor' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash,
        full_name: full_name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role,
        status: 'active',
      })
      .select('id, username, full_name, email, phone, role, status, created_at')
      .single();

    if (error) {
      // Handle duplicate username
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Username sudah digunakan' },
          { status: 409 }
        );
      }
      console.error('❌ Error creating user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ User created: ${data.username} (${data.role})`);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/users:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
