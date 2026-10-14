'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, RotateCcw } from 'lucide-react';
import { styleProfiles, type Product } from '@/lib/catalog';
import { styleResult } from '@/lib/domain';
import { api, track, useAtelier } from './atelier-provider';
import { ProductCard } from './product-card';
const questions = [
  {
    title: '¿Qué quieres que tu estilo diga de ti?',
    options: [
      'Encuentro belleza en lo esencial.',
      'Tengo mi propia forma de ver el mundo.',
      'Me gusta explorar y evolucionar.',
    ],
  },
  {
    title: '¿Qué te inspira más?',
    options: [
      'La calma de un espacio sencillo.',
      'Una obra de arte que rompe las reglas.',
      'Las calles de una ciudad en movimiento.',
    ],
  },
  {
    title: 'Elige una silueta.',
    options: [
      'Líneas limpias y proporciones suaves.',
      'Formas definidas y presencia escultórica.',
      'Sastrería relajada con un giro inesperado.',
    ],
  },
  {
    title: '¿Cómo construyes tu look?',
    options: [
      'Pocas piezas, elegidas con intención.',
      'Una pieza protagonista que habla por mí.',
      'Combinando lo clásico con algo nuevo.',
    ],
  },
];
export function IdentityScreen({ products }: { products: Product[] }) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { notify } = useAtelier();
  if (answers.length === 4) {
    const profile = styleProfiles[styleResult(answers)];
    return (
      <>
        <div className="quiz-result">
          <div className="quiz-result-photo">
            <Image
              src={profile.image}
              alt={profile.name}
              fill
              sizes="(max-width: 600px) 90vw, 45vw"
            />
          </div>
          <div className="quiz-result-copy">
            <span className="eyebrow">TU IDENTIDAD ÉLITE · {profile.tag}</span>
            <h1>{profile.name}.</h1>
            <p>{profile.description}</p>
            <p>
              Esta recomendación es una inspiración, no una etiqueta. Tu
              identidad siempre la defines tú.
            </p>
            <Link
              className="btn"
              href={
                '/colecciones?coleccion=' +
                encodeURIComponent(profile.collection)
              }
            >
              EXPLORAR MI SELECCIÓN <ArrowUpRight size={16} />
            </Link>
            <div className="preview-note" style={{ marginTop: 30 }}>
              {done ? (
                'Tu registro está guardado. Gracias por ser parte del círculo.'
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                      await api('leads', { email, consent, source: 'quiz' });
                      setDone(true);
                      track('lead_signup');
                    } catch (err) {
                      notify((err as Error).message, true);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label className="field">
                    <span>Acceso anticipado para tu estilo</span>
                    <input
                      type="email"
                      required
                      placeholder="Tu correo electrónico"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Acepto recibir novedades y la{' '}
                      <Link href="/politicas/privacidad">
                        política de privacidad
                      </Link>
                      .
                    </span>
                  </label>
                  <button
                    className="btn small"
                    disabled={busy}
                    style={{ marginTop: 15 }}
                  >
                    {busy ? 'Guardando…' : 'UNIRME AL CÍRCULO'}
                  </button>
                </form>
              )}
            </div>
            <button
              className="quiz-back"
              onClick={() => {
                setAnswers([]);
                setStarted(false);
              }}
            >
              <RotateCcw
                size={12}
                style={{ verticalAlign: 'middle', marginRight: 8 }}
              />{' '}
              Volver a descubrirme
            </button>
          </div>
        </div>
        <section className="section" style={{ paddingTop: 20 }}>
          <div className="section-title">
            <div>
              <span className="eyebrow">INSPIRADAS EN TU VISIÓN</span>
              <h2>Piezas que conectan contigo.</h2>
            </div>
          </div>
          <div className="product-grid">
            {products
              .filter((p) => p.collection === profile.collection)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </section>
      </>
    );
  }
  return (
    <section className="quiz-layout">
      <div className="quiz-visual">
        <Image
          src="/images/hero.webp"
          alt="Encuentra tu expresión personal"
          fill
          priority
          sizes="(max-width: 600px) 100vw, 50vw"
        />
        <div />
        <span>
          Tu estilo.
          <br />
          <em>Tu historia.</em>
        </span>
      </div>
      <div className="quiz-panel">
        <span className="eyebrow">DESCUBRE TU IDENTIDAD ÉLITE</span>
        {!started ? (
          <>
            <h1>
              Hay un lenguaje
              <br />
              que solo tú
              <br />
              <em>puedes vestir.</em>
            </h1>
            <p>
              Cuatro preguntas. Un minuto. Una selección de piezas inspiradas en
              tu forma de ser.
            </p>
            <button className="btn" onClick={() => setStarted(true)}>
              COMENZAR MI HISTORIA <ArrowUpRight size={16} />
            </button>
            <p className="form-note" style={{ marginTop: 20 }}>
              Sin registro obligatorio. Sin etiquetas. Solo inspiración.
            </p>
          </>
        ) : (
          <>
            <div className="quiz-progress">
              {questions.map((_, i) => (
                <i className={i <= answers.length ? 'done' : ''} key={i} />
              ))}
            </div>
            <span className="eyebrow">PREGUNTA 0{answers.length + 1} / 04</span>
            <h2>{questions[answers.length].title}</h2>
            <div className="quiz-options">
              {questions[answers.length].options.map((option, i) => (
                <button
                  key={option}
                  onClick={() => {
                    if (answers.length === 3) track('quiz_complete');
                    setAnswers([...answers, i]);
                  }}
                >
                  <span>0{i + 1}</span>
                  {option}
                  <ArrowUpRight size={14} style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
            <button
              className="quiz-back"
              onClick={() =>
                answers.length
                  ? setAnswers(answers.slice(0, -1))
                  : setStarted(false)
              }
            >
              <ArrowLeft
                size={12}
                style={{ verticalAlign: 'middle', marginRight: 7 }}
              />{' '}
              Volver
            </button>
          </>
        )}
      </div>
    </section>
  );
}
