'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { api, useAtelier } from './atelier-provider';
import { colors, sizes } from '@/lib/catalog';
export function CreatorScreen() {
  const [step, setStep] = useState(0);
  const [model, setModel] = useState('Blazer');
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('modelo');
    if (initial && ['Blazer', 'Pantalón', 'Top'].includes(initial))
      setModel(initial);
  }, []);
  const [material, setMaterial] = useState('Lana');
  const [color, setColor] = useState('Noir');
  const [detail, setDetail] = useState('Clásico');
  const [size, setSize] = useState('M');
  const [name, setName] = useState('Mi primera expresión');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { notify } = useAtelier();
  const image =
    model === 'Blazer'
      ? color === 'Ivory'
        ? '/images/ivory-blazer.webp'
        : '/images/blazer.webp'
      : model === 'Top'
        ? '/images/top.webp'
        : '/images/trousers.webp';
  return (
    <>
      <div className="page-heading studio-heading">
        <span className="eyebrow">CO-CREACIÓN · TU ATELIER PERSONAL</span>
        <h1>
          Diseña tu propia <em>expresión.</em>
        </h1>
        <p>
          Elige una silueta, explora materiales y dale tu firma. Guarda tu
          propuesta o deja que inspire a la comunidad.
        </p>
      </div>
      <div className="studio-status">
        <span>
          <i /> DESIGN STUDIO / ÉLITE ATELIER
        </span>
        <span>
          PROPUESTA CONCEPTUAL · {String(step + 1).padStart(2, '0')} / 04
        </span>
      </div>
      <section className="creator-layout">
        <div className="creator-canvas">
          <div className="studio-rail">
            {['Blazer', 'Pantalón', 'Top'].map((m) => (
              <button
                key={m}
                aria-label={'Vista de ' + m}
                aria-pressed={model === m}
                className={model === m ? 'active' : ''}
                onClick={() => {
                  setModel(m);
                  setSaved(false);
                }}
              >
                <Image
                  src={
                    m === 'Top'
                      ? '/images/top.webp'
                      : m === 'Pantalón'
                        ? '/images/trousers.webp'
                        : '/images/blazer.webp'
                  }
                  alt=""
                  width={65}
                  height={82}
                />
              </button>
            ))}
          </div>
          <span className="eyebrow">ÉLITE ATELIER / DESIGN STUDIO</span>
          <Image
            src={image}
            alt={'Referencia conceptual de ' + model}
            fill
            priority
            sizes="(max-width: 600px) 88vw, 50vw"
            style={
              color === 'Taupe' ? { filter: 'sepia(.5) brightness(1.12)' } : {}
            }
          />
          <div className="creator-details">
            <span>
              {model.toUpperCase()} · {material.toUpperCase()} ·{' '}
              {color.toUpperCase()}
            </span>
            <span>TALLA {size}</span>
          </div>
        </div>
        <div className="creator-panel">
          <span className="eyebrow">01 / IMAGINA · ELIGE · EXPRESA</span>
          <h2>Tu visión, en cada detalle.</h2>
          <p>
            Una propuesta conceptual que comienza contigo. La imagen representa
            la silueta; las opciones elegidas se guardan como especificaciones.
          </p>
          <div
            className="studio-progress"
            aria-label={'Paso ' + (step + 1) + ' de 4'}
          >
            <span style={{ width: (step + 1) * 25 + '%' }} />
          </div>
          <div className="creator-tabs">
            {['Modelo', 'Material', 'Color', 'Detalles'].map((s, i) => (
              <button
                key={s}
                className={step === i ? 'active' : ''}
                onClick={() => setStep(i)}
              >
                <small>{String(i + 1).padStart(2, '0')}</small>
                {s}
              </button>
            ))}
          </div>
          {step === 0 && (
            <>
              <span className="eyebrow">EL PUNTO DE PARTIDA</span>
              <div className="choice-grid">
                {['Blazer', 'Pantalón', 'Top'].map((m) => (
                  <button
                    key={m}
                    className={'choice-card ' + (model === m ? 'selected' : '')}
                    onClick={() => {
                      setModel(m);
                      setSaved(false);
                    }}
                  >
                    <Image
                      src={
                        m === 'Top'
                          ? '/images/top.webp'
                          : m === 'Pantalón'
                            ? '/images/trousers.webp'
                            : '/images/blazer.webp'
                      }
                      alt=""
                      width={95}
                      height={110}
                      className="model-thumbnail"
                    />
                    {m}
                    <small>
                      {m === 'Blazer'
                        ? 'Estructura & carácter'
                        : m === 'Top'
                          ? 'Movimiento & luz'
                          : 'Líneas & libertad'}
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <span className="eyebrow">LA TEXTURA DE TU HISTORIA</span>
              <div className="choice-grid">
                {['Lana', 'Lino', 'Satén'].map((m, i) => (
                  <button
                    key={m}
                    className={
                      'choice-card ' + (material === m ? 'selected' : '')
                    }
                    onClick={() => {
                      setMaterial(m);
                      setSaved(false);
                    }}
                  >
                    <span
                      className="fabric-sample"
                      style={{
                        background:
                          i === 0
                            ? 'repeating-linear-gradient(45deg,#55534c,#55534c 1px,#625f56 2px,#625f56 3px)'
                            : i === 1
                              ? 'repeating-linear-gradient(90deg,#d5cab7,#d5cab7 1px,#bfb39c 2px,#cbbfa9 3px)'
                              : 'linear-gradient(135deg,#f1eade,#c8bda9,#efe8db)',
                      }}
                    />
                    {m}
                    <small>
                      {i === 0
                        ? 'Estructura suave'
                        : i === 1
                          ? 'Textura natural'
                          : 'Caída fluida'}
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">TU TONO, TU INTENCIÓN</span>
              <div className="choice-grid">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    className={
                      'choice-card ' + (color === c.name ? 'selected' : '')
                    }
                    onClick={() => {
                      setColor(c.name);
                      setSaved(false);
                    }}
                  >
                    <span
                      className="fabric-sample"
                      style={{ background: c.hex }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">EL GESTO QUE LO HACE TUYO</span>
              <div className="choice-grid">
                {['Clásico', 'Contraste', 'Minimal'].map((d) => (
                  <button
                    key={d}
                    className={
                      'choice-card ' + (detail === d ? 'selected' : '')
                    }
                    onClick={() => {
                      setDetail(d);
                      setSaved(false);
                    }}
                  >
                    {d}
                    <small>
                      {d === 'Clásico'
                        ? 'Mismo tono'
                        : d === 'Contraste'
                          ? 'Costura visible'
                          : 'Líneas depuradas'}
                    </small>
                  </button>
                ))}
              </div>
              <div className="option-heading">
                <span>Tu talla</span>
                <Link href="/guia-tallas">Guía de tallas</Link>
              </div>
              <div className="size-options">
                {sizes.map((s) => (
                  <button
                    key={s}
                    className={s === size ? 'selected' : ''}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="creator-summary">
            <div>
              <span>Tu propuesta</span>
              <span>
                {model} / {material}
              </span>
            </div>
            <div>
              <span>Color & acabado</span>
              <span>
                {color} / {detail}
              </span>
            </div>
          </div>
          {step < 3 ? (
            <button
              className="btn full"
              style={{ marginTop: 25 }}
              onClick={() => setStep(step + 1)}
            >
              CONTINUAR CON {['MATERIAL', 'COLOR', 'DETALLES'][step]}{' '}
              <ArrowUpRight size={16} />
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api('designs', {
                    name,
                    model,
                    material,
                    color,
                    detail,
                    size,
                    share,
                  });
                  setSaved(true);
                  notify(
                    share
                      ? 'Tu propuesta está en revisión antes de publicarse.'
                      : 'Tu diseño está guardado en tu cuenta.',
                  );
                } catch (err) {
                  notify((err as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field" style={{ marginTop: 23 }}>
                <span>Dale un nombre a tu creación</span>
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={share}
                  onChange={(e) => {
                    setShare(e.target.checked);
                    setSaved(false);
                  }}
                />
                <span>
                  Compartir mi propuesta con la comunidad, sujeta a moderación.
                </span>
              </label>
              <button
                className="btn full"
                style={{ marginTop: 20 }}
                disabled={busy || saved}
              >
                {saved ? (
                  <>
                    <Check size={15} /> PROPUESTA GUARDADA
                  </>
                ) : busy ? (
                  'GUARDANDO…'
                ) : (
                  <>
                    GUARDAR MI CREACIÓN <ArrowUpRight size={16} />
                  </>
                )}
              </button>
              {saved && (
                <Link
                  href="/cuenta"
                  className="text-link"
                  style={{ marginTop: 20 }}
                >
                  Ver mis creaciones <ArrowUpRight size={14} />
                </Link>
              )}
            </form>
          )}
          <p className="form-note">
            Necesitas una cuenta para guardar. La co-creación es conceptual:
            guardar un diseño no confirma fabricación, precio ni derechos
            exclusivos.
          </p>
          <Link href="/cuenta" className="back-link">
            Crear cuenta o iniciar sesión <ArrowUpRight size={12} />
          </Link>
        </div>
      </section>
    </>
  );
}
