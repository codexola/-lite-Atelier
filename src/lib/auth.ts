import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { HttpError } from './http';
export { HttpError } from './http';
export type User = { id: string; email: string; name: string; role: string };
export { hashPassword, verifyPassword } from './password';
function secret() {
  if (process.env.AUTH_SECRET) {
    if (process.env.AUTH_SECRET.length < 32)
      throw new Error('AUTH_SECRET debe tener al menos 32 caracteres.');
    return new TextEncoder().encode(process.env.AUTH_SECRET);
  }
  if (process.env.VERCEL)
    throw new Error('La autenticación no está configurada.');
  const dir = path.join(process.cwd(), '.data');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'session-key');
  if (!existsSync(file))
    writeFileSync(file, randomBytes(48).toString('hex'), {
      mode: 0o600,
      flag: 'wx',
    });
  return new TextEncoder().encode(readFileSync(file, 'utf8'));
}
export async function session(user: User, staff = false) {
  const c = await db();
  const row = await c.execute({
    sql: 'SELECT session_version FROM users WHERE id=?',
    args: [user.id],
  });
  const token = await new SignJWT({
    sub: user.id,
    version: Number(row.rows[0]?.session_version || 0),
    scope: staff ? 'staff' : 'customer',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(staff ? '8h' : '7d')
    .sign(secret());
  (await cookies()).set(staff ? 'atelier_staff' : 'atelier_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: staff ? 28800 : 604800,
  });
}
export async function currentUser(staff = false): Promise<User | null> {
  const token = (await cookies()).get(
    staff ? 'atelier_staff' : 'atelier_session',
  )?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ['HS256'],
    });
    if (staff && payload.scope !== 'staff') return null;
    const c = await db();
    const result = await c.execute({
      sql: 'SELECT id,email,name,role,session_version FROM users WHERE id=?',
      args: [String(payload.sub)],
    });
    const row = result.rows[0];
    if (!row || Number(row.session_version) !== payload.version) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      role: String(row.role),
    };
  } catch {
    return null;
  }
}
export async function requireStaff(roles = ['admin', 'editor', 'operator']) {
  const user = await currentUser(true);
  if (!user) throw new HttpError(401, 'Inicia sesión en el acceso del equipo.');
  if (!roles.includes(user.role))
    throw new HttpError(403, 'No tienes acceso a esta función.');
  return user;
}
export async function requireUser(roles?: string[]) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Inicia sesión para continuar.');
  if (roles && !roles.includes(user.role))
    throw new HttpError(403, 'No tienes acceso a esta función.');
  return user;
}
export async function rateLimit(scope: string, identity: string, limit = 20) {
  const key = createHash('sha256')
    .update(scope + identity)
    .digest('hex');
  const c = await db();
  const now = Date.now();
  const row = await c.execute({
    sql: 'INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END RETURNING count',
    args: [key, now + 900000, now, now],
  });
  if (Number(row.rows[0]?.count) > limit)
    throw new HttpError(
      429,
      'Demasiados intentos. Vuelve a intentarlo en 15 minutos.',
    );
}
