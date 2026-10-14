'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  Download,
  Trash2,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { api } from './atelier-provider';
import type { Product } from '@/lib/catalog';
export function RealisticFitting({
  product,
  color,
  capture,
}: {
  product: Product;
  color: string;
  capture: () => string | null;
}) {
  const [configured, setConfigured] = useState(false),
    [consent, setConsent] = useState(false),
    [original, setOriginal] = useState<string | null>(null),
    [result, setResult] = useState<string | null>(null),
    [status, setStatus] = useState('idle'),
    [error, setError] = useState(''),
    [compare, setCompare] = useState(50),
    [label, setLabel] = useState(''),
    [history, setHistory] = useState<
      { image: string; original: string; label: string }[]
    >([]);
  const job = useRef<string | null>(null),
    poll = useRef<ReturnType<typeof setTimeout> | null>(null),
    session = useRef(0),
    started = useRef(0);
  const generation = useRef({ original: '', label: '' });
  useEffect(() => {
    void api('try-on/config')
      .then((r) => setConfigured(r.configured))
      .catch(() => {});
    return () => {
      session.current++;
      if (poll.current) clearTimeout(poll.current);
      if (job.current)
        void api('try-on/delete', { id: job.current }).catch(() => {});
    };
  }, []);
  async function check(id: string, current: number) {
    if (current !== session.current) return;
    try {
      const r = await api('try-on/jobs/' + id);
      if (current !== session.current) return;
      setStatus(r.status);
      if (r.status === 'completed' && r.image) {
        setResult(r.image);
        setHistory((old) =>
          [{ image: r.image, ...generation.current }, ...old].slice(0, 5),
        );
        return;
      }
      if (['failed', 'canceled', 'time_out'].includes(r.status)) {
        setError(
          r.error ||
            'La generación no pudo completarse. Puedes iniciar otro look.',
        );
        return;
      }
      if (Date.now() - started.current > 300000) {
        setStatus('paused');
        setError(
          'La generación continúa. Puedes volver a consultar este mismo trabajo sin iniciar otro.',
        );
        return;
      }
      poll.current = setTimeout(() => void check(id, current), 3000);
    } catch (e) {
      if (current === session.current) {
        setStatus('paused');
        setError((e as Error).message);
      }
    }
  }
  const busy = ['submitting', 'starting', 'in_queue', 'processing'].includes(
    status,
  );
  async function generate() {
    if (!consent || !configured || busy) return;
    const image = original || capture();
    if (!image) {
      setError(
        'Activa la cámara o carga una foto local antes de capturar tu look.',
      );
      return;
    }
    setOriginal(image);
    setResult(null);
    setError('');
    setStatus('submitting');
    setLabel(product.name + ' / ' + color);
    session.current++;
    const current = session.current;
    generation.current = {
      original: image,
      label: product.name + ' / ' + color,
    };
    try {
      const blob = await (await fetch(image)).blob(),
        form = new FormData();
      form.set('photo', blob, 'mi-foto.jpg');
      form.set('productId', product.id);
      form.set('color', color);
      form.set('consent', 'true');
      form.set('key', crypto.randomUUID());
      const response = await fetch('/api/try-on/start', {
          method: 'POST',
          body: form,
        }),
        data = await response.json();
      if (!response.ok)
        throw new Error(data.error || 'No pudimos iniciar el probador.');
      if (current !== session.current) {
        void api('try-on/delete', { id: data.id }).catch(() => {});
        return;
      }
      job.current = data.id;
      started.current = Date.now();
      setStatus(data.status);
      poll.current = setTimeout(() => void check(data.id, current), 2000);
    } catch (e) {
      if (current === session.current) {
        setStatus('failed');
        setError((e as Error).message);
      }
    }
  }
  function clear() {
    session.current++;
    if (poll.current) clearTimeout(poll.current);
    if (job.current)
      void api('try-on/delete', { id: job.current }).catch(() => {});
    job.current = null;
    setOriginal(null);
    setResult(null);
    setHistory([]);
    setStatus('idle');
    setError('');
    setConsent(false);
  }
  return (
    <section className="realistic-fitting">
      <div className="realistic-heading">
        <div>
          <span className="eyebrow">ÉLITE LAB / FASHN AI</span>
          <h2>
            Una imagen.
            <br />
            <em>Otra posibilidad.</em>
          </h2>
          <p>
            Genera una fotografía de tu look, con una prenda integrada en tu
            imagen. La generación se procesa en FASHN, después de tu
            autorización.
          </p>
        </div>
        <span className={'provider-status ' + (configured ? 'ready' : '')}>
          <i />
          {configured ? 'FASHN conectado' : 'FASHN pendiente de configuración'}
        </span>
      </div>
      <div className="realistic-layout">
        <div className="realistic-preview">
          {original ? (
            <div className="tryon-comparison">
              <img src={original} alt="Tu foto capturada para comparar" />
              {result && (
                <img
                  src={result}
                  alt={'Look generado con IA: ' + label}
                  style={{ clipPath: 'inset(0 ' + (100 - compare) + '% 0 0)' }}
                />
              )}
              {result && (
                <span
                  className="comparison-line"
                  style={{ left: compare + '%' }}
                />
              )}
              <span className="compare-label">
                {result ? 'ORIGINAL / LOOK GENERADO' : 'TU FOTO / SIN ENVIAR'}
              </span>
              {busy && (
                <div className="generation-progress">
                  <Sparkles size={28} />
                  <span>
                    {status === 'in_queue'
                      ? 'Tu look está en la cola'
                      : 'Estamos creando tu look…'}
                  </span>
                  <small>
                    Puedes seguir explorando; la imagen no se publica.
                  </small>
                </div>
              )}
            </div>
          ) : (
            <div className="realistic-empty">
              <Sparkles size={45} strokeWidth={0.8} />
              <h3>
                El próximo look
                <br />
                <em>empieza contigo.</em>
              </h3>
              <p>
                Captura una foto frontal con buena luz, brazos ligeramente
                separados y la zona de la prenda visible.
              </p>
            </div>
          )}
          {result && (
            <label className="comparison-control">
              <span>Comparar antes y después</span>
              <input
                aria-label="Comparar foto original y look generado"
                type="range"
                min={0}
                max={100}
                value={compare}
                onChange={(e) => setCompare(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        <div className="realistic-controls">
          <span className="eyebrow">01 / TU FOTO</span>
          <h3>{product.name}</h3>
          <p>{color} · El resultado visual no determina tu talla real.</p>
          <button
            className="btn btn-outline full"
            disabled={busy}
            onClick={() => {
              const image = capture();
              if (image) {
                setOriginal(image);
                setResult(null);
                setError('');
                setStatus('idle');
              } else
                setError('Primero activa la cámara o carga una foto local.');
            }}
          >
            <Camera size={17} />
            Capturar mi foto
          </button>
          <label className="checkbox-label provider-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Autorizo enviar esta foto y la referencia de prenda a FASHN para
              generar mi look. Tengo permiso para utilizar la foto.{' '}
              <Link href="/politicas/privacidad">Privacidad del probador</Link>.
            </span>
          </label>
          <button
            className="btn full"
            disabled={!configured || !consent || busy}
            onClick={() => void generate()}
          >
            <Sparkles size={17} />
            {busy ? 'CREANDO TU LOOK…' : 'GENERAR LOOK REALISTA'}
          </button>
          {!configured && (
            <p className="provider-note">
              La marca debe configurar su cuenta FASHN para habilitar la
              generación. La vista previa local de cámara sigue disponible.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
              {error.includes('sesión') && (
                <Link href="/cuenta"> Iniciar sesión</Link>
              )}
            </p>
          )}
          {status === 'paused' && job.current && (
            <button
              className="text-link"
              onClick={() => {
                setError('');
                started.current = Date.now();
                void check(job.current!, session.current);
              }}
            >
              <RotateCcw size={15} />
              Volver a consultar mi look
            </button>
          )}
          {result && (
            <a
              className="btn btn-outline full"
              href={result}
              download="elite-atelier-look-ia.jpg"
            >
              <Download size={16} />
              Descargar look generado
            </a>
          )}
          {(original || result) && (
            <button className="text-link" onClick={clear}>
              <Trash2 size={15} />
              Borrar esta experiencia
            </button>
          )}
          <p className="provider-note">
            No guardamos la fotografía ni el resultado en tu cuenta. La
            generación utiliza un proveedor externo y puede variar detalles de
            la prenda o del cuerpo; no garantiza ajuste físico. Borrar aquí no
            cancela un trabajo ya enviado al proveedor.
          </p>
        </div>
      </div>
      {!!history.length && (
        <div className="tryon-history">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => {
                setResult(h.image);
                if (h.original) setOriginal(h.original);
                setLabel(h.label);
              }}
            >
              <img src={h.image} alt={h.label} />
              <span>{h.label}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
