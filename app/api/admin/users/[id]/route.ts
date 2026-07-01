import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, phone, role, status, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
      console.error('❌ Error fetching user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/users/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await req.json();
    const { full_name, email, phone, role, status, password } = body;

    const supabase = createServerClient();

    // Build update payload
    const updateData: Record<string, any> = {};

    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (role !== undefined) {
      if (role !== 'admin' && role !== 'tutor') {
        return NextResponse.json({ error: 'Role harus admin atau tutor' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (status !== undefined) {
      if (status !== 'active' && status !== 'inactive') {
        return NextResponse.json({ error: 'Status harus active atau inactive' }, { status: 400 });
      }
      updateData.status = status;
    }

    // Jika ada password baru, hash
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diupdate' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, full_name, email, phone, role, status, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
      console.error('❌ Error updating user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ User updated: ${data.username}`);
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('❌ Error in PUT /api/admin/users/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    // Cegah admin menghapus diri sendiri
    if (id === auth.user.sub) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun sendiri' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      }
      console.error('❌ Error deleting user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ User deleted: ${id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Error in DELETE /api/admin/users/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
