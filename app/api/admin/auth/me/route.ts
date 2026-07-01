import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        id: user.sub,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/auth/me:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
