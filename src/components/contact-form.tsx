'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { api } from './atelier-provider';
export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="form-card">
      <h2>Empecemos una conversación.</h2>
      <p>Una pregunta, una idea o una nueva posibilidad.</p>
      {done ? (
        <div className="form-success">
          Tu mensaje está guardado en el atelier. El equipo podrá consultarlo
          desde el panel de administración.
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              await api('contact', {
                name: f.get('name'),
                email: f.get('email'),
                subject: f.get('subject'),
                message: f.get('message'),
                consent: true,
              });
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
          <label className="field">
            <span>Tu nombre</span>
            <input name="name" required minLength={2} maxLength={100} />
          </label>
          <label className="field">
            <span>Correo electrónico</span>
            <input name="email" type="email" required />
          </label>
          <label className="field">
            <span>¿Sobre qué quieres conversar?</span>
            <select name="subject">
              <option>Información general</option>
              <option>Mi pedido</option>
              <option>Colaboraciones</option>
              <option>Privacidad y datos personales</option>
              <option>Reportar contenido</option>
            </select>
          </label>
          <label className="field">
            <span>Tu mensaje</span>
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={3000}
              rows={4}
            />
          </label>
          <label className="checkbox-label" style={{ marginBottom: 22 }}>
            <input type="checkbox" required />
            <span>
              Autorizo el tratamiento de estos datos para responder mi consulta.
              He leído la{' '}
              <Link href="/politicas/privacidad">política de privacidad</Link>.
            </span>
          </label>
          <button className="btn full" disabled={busy}>
            {busy ? 'ENVIANDO…' : 'ENVIAR MI MENSAJE'}{' '}
            <ArrowUpRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
