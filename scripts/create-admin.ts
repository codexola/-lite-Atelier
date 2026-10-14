import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/password';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 14 || !email.includes('@')) {
  console.error(
    'Configure ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 14 caracteres) mediante variables seguras. Nunca use credenciales públicas.',
  );
  process.exit(1);
}
const c = await db();
const existing = await c.execute({
  sql: 'SELECT id FROM users WHERE email=?',
  args: [email],
});
if (existing.rows.length) {
  await c.execute({
    sql: "UPDATE users SET role='admin' WHERE email=?",
    args: [email],
  });
  console.log(
    'Cuenta existente promovida a administrador. Su contraseña se ha conservado.',
  );
} else {
  await c.execute({
    sql: "INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,'admin')",
    args: [
      crypto.randomUUID(),
      email,
      'Administración Élite',
      hashPassword(password),
    ],
  });
  console.log('Administrador creado.');
}
c.close();
