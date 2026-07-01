import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  let secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET tidak di-set! Tambahkan ke environment variables di Vercel/production.');
    }
    console.warn(
      '⚠️ JWT_SECRET tidak di-set di environment variables. ' +
      'Tambahkan JWT_SECRET=... di file .env.local untuk menghilangkan warning ini. ' +
      'Menggunakan fallback development (tidak aman untuk production).'
    );
    secret = 'dev-fallback-secret-jangan-pakai-ini-di-production';
  }

  return new TextEncoder().encode(secret);
}

export interface JwtPayload {
  sub: string;
  username: string;
  full_name: string;
  role: 'admin' | 'tutor';
}

export async function signToken(user: { id: string; username: string; full_name: string; role: 'admin' | 'tutor' }): Promise<string> {
  const token = await new SignJWT({ 
    sub: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());

  return token;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Validasi payload memiliki field yang diperlukan
    const jwtPayload = payload as unknown as Record<string, any>;
    if (!jwtPayload.sub || !jwtPayload.role) {
      console.warn('⚠️ Token tidak memiliki field required (sub/role), kemungkinan token lama');
      return null;
    }
    return jwtPayload as unknown as JwtPayload;
  } catch (err) {
    console.error('❌ JWT verification failed:', err);
    return null;
  }
}

// Maintain backward compatibility
export const signAdminToken = () => signToken({ id: 'admin', username: 'admin', full_name: 'Admin', role: 'admin' });
export const verifyAdminToken = async (token: string): Promise<boolean> => {
  const payload = await verifyToken(token);
  return payload?.role === 'admin';
};
