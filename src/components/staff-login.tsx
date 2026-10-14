'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api } from './atelier-provider';
export function StaffLogin() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="staff-login">
      <div className="staff-login-art">
        <Link href="/" className="wordmark">
          ÉLITE ATELIER<span>BUSINESS STUDIO</span>
        </Link>
        <div className="staff-orbit">
          <i />
          <i />
          <ShieldCheck size={78} strokeWidth={0.7} />
        </div>
        <div>
          <span className="eyebrow">
            UN ESPACIO PARA CREAR LO EXTRAORDINARIO
          </span>
          <h1>
            La visión es tuya.
            <br />
            <em>El atelier también.</em>
          </h1>
          <p>Gestión precisa. Diseño con intención.</p>
        </div>
        <small>ÉLITE ATELIER / EQUIPO</small>
      </div>
      <div className="staff-login-form">
        <span className="eyebrow">ACCESO EXCLUSIVO DEL EQUIPO</span>
        <h2>
          Bienvenido
          <br />
          <em>a tu workspace.</em>
        </h2>
        <p>
          Inicia sesión con tus credenciales administrativas. El acceso de
          clientes es independiente.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            try {
              await api('staff/login', {
                email: form.get('email'),
                password: form.get('password'),
              });
              router.replace('/admin');
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>Correo del equipo</span>
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label className="field">
            <span>Contraseña del equipo</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn full" disabled={busy}>
            {busy ? 'VERIFICANDO…' : 'ENTRAR AL BUSINESS STUDIO'}
            <ArrowUpRight size={17} />
          </button>
        </form>
        <div className="staff-login-note">
          <LockKeyhole size={16} />
          <span>Sesión privada · Acceso por responsabilidad</span>
        </div>
        <Link href="/" className="text-link">
          Volver a la tienda <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
