'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from './atelier-provider';
export function RecoveryScreen() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);
  return (
    <div className="prose">
      <span className="eyebrow">TU ACCESO AL ATELIER</span>
      <h2>{token ? 'Una nueva contraseña.' : 'Volvamos a tu espacio.'}</h2>
      {done ? (
        <div className="form-success">
          {token
            ? 'Tu contraseña se ha actualizado. Ya puedes iniciar sesión.'
            : 'Si existe una cuenta con ese correo, recibirás un enlace de recuperación. Revisa también tu carpeta de spam.'}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              await api(
                token ? 'auth/reset' : 'auth/forgot',
                token
                  ? { token, password: f.get('password') }
                  : { email: f.get('email') },
              );
              setDone(true);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {token ? (
            <label className="field">
              <span>Nueva contraseña · mínimo 10 caracteres</span>
              <input
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          ) : (
            <label className="field">
              <span>El correo de tu cuenta</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
          )}
          <button className="btn" disabled={busy}>
            {busy
              ? 'UN MOMENTO…'
              : token
                ? 'ACTUALIZAR CONTRASEÑA'
                : 'ENVIAR ENLACE'}
          </button>
          <p className="form-note">
            El enlace es de un solo uso y vence después de 30 minutos.
          </p>
        </form>
      )}
      <Link className="text-link" href="/cuenta" style={{ marginTop: 25 }}>
        Volver a mi cuenta
      </Link>
    </div>
  );
}
export function UnsubscribeScreen() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="confirmation">
      <span className="eyebrow">TÚ ELIGES LA CONEXIÓN</span>
      <h1>
        {done ? 'Tu preferencia está guardada.' : '¿Dejamos de escribirte?'}
      </h1>
      <p>
        {done
          ? 'Hemos procesado la baja de comunicaciones comerciales. Puedes volver a unirte cuando quieras.'
          : 'Puedes cancelar tu suscripción a novedades sin afectar a tu cuenta o tus pedidos.'}
      </p>
      {error && <div className="form-error">{error}</div>}
      {!done && (
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const token = new URLSearchParams(window.location.search).get(
                'token',
              );
              await api('unsubscribe', { token });
              setDone(true);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'GUARDANDO…' : 'CONFIRMAR MI BAJA'}
        </button>
      )}
      <div style={{ marginTop: 25 }}>
        <Link href="/" className="text-link">
          Volver al atelier
        </Link>
      </div>
    </div>
  );
}
