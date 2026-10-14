'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Instagram } from 'lucide-react';
import { api, useAtelier, track } from './atelier-provider';
export function Newsletter({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { notify } = useAtelier();
  return (
    <div className={'newsletter ' + (dark ? 'dark' : '')}>
      <div>
        <span className="eyebrow">EL CÍRCULO ÉLITE</span>
        <h2>
          Lo extraordinario empieza
          <br />
          con una conexión.
        </h2>
        <p>
          Historias, nuevas expresiones y acceso anticipado.
          <br />
          Una invitación a ser parte de algo propio.
        </p>
      </div>
      {done ? (
        <div className="newsletter-success">
          <span className="eyebrow">YA FORMAS PARTE</span>
          <h3>Bienvenido a tu atelier.</h3>
          <p>
            Tu registro está guardado. Te avisaremos cuando tengamos novedades.
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('leads', { email, consent, source: 'newsletter' });
              setDone(true);
              track('lead_signup');
            } catch (err) {
              notify((err as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="sr-only" htmlFor={'newsletter-email-' + dark}>
            Tu correo electrónico
          </label>
          <div className="newsletter-input">
            <input
              id={'newsletter-email-' + dark}
              type="email"
              required
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={busy} aria-label="Unirme al círculo">
              {busy ? '…' : <ArrowRight size={21} />}
            </button>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Acepto recibir novedades y la{' '}
              <Link href="/politicas/privacidad">política de privacidad</Link>.
              Puedo darme de baja en cualquier momento.
            </span>
          </label>
        </form>
      )}
    </div>
  );
}
export function Footer({ mode }: { mode: string }) {
  const { setConsent } = useAtelier();
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link href="/" className="wordmark">
            ÉLITE ATELIER<span>WEAR YOUR OWN IDENTITY</span>
          </Link>
          <p>
            Más que moda.
            <br />
            Una forma de ser tú.
          </p>
          <span className="footer-place">COLOMBIA · PARA EL MUNDO</span>
        </div>
        <div>
          <h3>EXPLORA</h3>
          <Link href="/colecciones">Las colecciones</Link>
          <Link href="/co-creacion">Tu atelier</Link>
          <Link href="/probador-virtual">Tu probador virtual</Link>
          <Link href="/identidad">Descubre tu identidad</Link>
          <Link href="/comunidad">La comunidad</Link>
        </div>
        <div>
          <h3>LA MAISON</h3>
          <Link href="/manifiesto">Nuestro manifiesto</Link>
          <Link href="/universo">Universo Atelier</Link>
          <Link href="/journal">Journal</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/cuenta">Mi cuenta</Link>
        </div>
        <div>
          <h3>A TU LADO</h3>
          <Link href="/ayuda">Preguntas frecuentes</Link>
          <Link href="/guia-tallas">Guía de tallas</Link>
          <Link href="/politicas/envios">Envíos y devoluciones</Link>
          <Link href="/politicas/privacidad">Privacidad</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Élite Atelier. Viste tu identidad.
        </span>
        <span className="preview-indicator">
          <i />{' '}
          {mode === 'live'
            ? 'VISTE TU IDENTIDAD · COLOMBIA'
            : 'VISTA PREVIA · COLECCIÓN CONCEPTUAL'}
        </span>
        <div>
          <button onClick={() => setConsent('')}>
            Preferencias de privacidad
          </button>
          <Link href="/politicas/terminos">Términos</Link>
          <span>ES / COP</span>
        </div>
      </div>
    </footer>
  );
}
