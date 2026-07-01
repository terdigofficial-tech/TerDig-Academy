import { NextRequest } from 'next/server';
import { verifyToken, JwtPayload } from '@/lib/auth';

export async function getCurrentUser(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: ('admin' | 'tutor')[]
): Promise<{ user: JwtPayload; error: null } | { user: null; error: { status: number; message: string } }> {
  const user = await getCurrentUser(req);
  
  if (!user) {
    return { user: null, error: { status: 401, message: 'Unauthorized - Silakan login terlebih dahulu' } };
  }
  
  if (!allowedRoles.includes(user.role)) {
    return { user: null, error: { status: 403, message: 'Forbidden - Anda tidak memiliki akses ke resource ini' } };
  }
  
  return { user, error: null };
}
