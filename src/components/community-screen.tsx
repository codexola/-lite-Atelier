'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  ArrowUpRight,
  Plus,
  X,
  ThumbsUp,
  Flag,
} from 'lucide-react';
import { useDialog } from './use-dialog';
import { api, useAtelier } from './atelier-provider';
export function CommunityScreen({ initialPosts }: { initialPosts: any[] }) {
  const [data, setData] = useState<any>({
    posts: initialPosts,
    designs: [],
    comments: [],
  });
  const [tab, setTab] = useState('Explorar');
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useAtelier();
  useDialog(modal, '.modal', () => setModal(false));
  async function load() {
    try {
      setData(await api('community'));
    } catch {}
  }
  useEffect(() => {
    void load();
  }, []);
  const posts =
    tab === 'Explorar'
      ? data.posts
      : data.posts.filter((p: any) => p.category === tab);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">PERSONAS DISTINTAS. UNA MISMA VISIÓN.</span>
        <h1>
          La belleza de <em>conectar.</em>
        </h1>
        <p>
          Historias, ideas y maneras de ver el mundo. Un espacio para inspirarte
          y compartir lo que te hace único.
        </p>
      </div>
      <div className="page-container">
        <div className="community-toolbar">
          <div className="community-tabs">
            {['Explorar', 'Inspiración', 'Historias', 'Creaciones'].map((t) => (
              <button
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn small"
            onClick={() => {
              setModal(true);
              setError('');
            }}
          >
            COMPARTIR MI HISTORIA <Plus size={14} />
          </button>
        </div>
        {tab === 'Creaciones' && (
          <>
            <div className="preview-note">
              Las propuestas publicadas han pasado por moderación. Los votos
              expresan interés; no confirman fabricación.
            </div>
            <div className="community-grid" style={{ marginBottom: 30 }}>
              {data.designs.map((d: any) => (
                <article className="post-card" key={d.id}>
                  <div className="post-photo">
                    <Image
                      src={
                        d.model === 'Top'
                          ? '/images/top.webp'
                          : d.model === 'Pantalón'
                            ? '/images/trousers.webp'
                            : '/images/blazer.webp'
                      }
                      alt={d.name}
                      fill
                      sizes="(max-width: 600px) 88vw, 33vw"
                    />
                  </div>
                  <div className="post-body">
                    <span className="eyebrow">PROPUESTA DE {d.author}</span>
                    <h3>{d.name}</h3>
                    <p>
                      {d.model} / {d.material} / {d.color}
                    </p>
                    <div className="post-actions">
                      <button
                        onClick={async () => {
                          try {
                            await api('votes', { id: d.id });
                            await load();
                          } catch (e) {
                            notify((e as Error).message, true);
                          }
                        }}
                      >
                        <ThumbsUp size={15} /> {d.votes} votos · Votar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <div className="community-grid">
          {posts.map((p: any) => (
            <article className="post-card" key={p.id}>
              {p.image && (
                <div className="post-photo">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(max-width: 600px) 88vw, (max-width: 850px) 45vw, 30vw"
                  />
                </div>
              )}
              <div className="post-body">
                <div className="post-author">
                  <span className="avatar">
                    {(p.author || 'É').slice(0, 1)}
                  </span>
                  <span>{p.author || 'Élite Atelier · Editorial'}</span>
                </div>
                <span className="eyebrow">{p.category}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <div className="post-actions">
                  <button
                    aria-label={'Me gusta: ' + p.title}
                    onClick={async () => {
                      try {
                        await api('likes', { id: p.id });
                        await load();
                      } catch (e) {
                        notify((e as Error).message, true);
                      }
                    }}
                  >
                    <Heart size={15} fill={p.liked ? 'currentColor' : 'none'} />{' '}
                    {p.likes || 0}
                  </button>
                  <button
                    aria-label={'Comentarios de ' + p.title}
                    onClick={() => setExpanded(expanded === p.id ? '' : p.id)}
                  >
                    <MessageCircle size={15} />{' '}
                    {
                      data.comments.filter((c: any) => c.post_id === p.id)
                        .length
                    }
                  </button>
                  <Link
                    href={
                      '/contacto?asunto=' +
                      encodeURIComponent('Reportar publicación ' + p.id)
                    }
                    style={{ marginLeft: 'auto' }}
                    aria-label={'Reportar ' + p.title}
                  >
                    <Flag size={14} />
                  </Link>
                </div>
                {expanded === p.id && (
                  <div className="post-comments">
                    {data.comments
                      .filter((c: any) => c.post_id === p.id)
                      .map((c: any) => (
                        <p key={c.id}>
                          <strong>{c.author}</strong>
                          <br />
                          {c.body}
                        </p>
                      ))}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const f = new FormData(form);
                        try {
                          await api('comments', {
                            postId: p.id,
                            body: f.get('body'),
                          });
                          notify(
                            'Tu comentario se revisará antes de publicarse.',
                          );
                          form.reset();
                        } catch (e) {
                          notify((e as Error).message, true);
                        }
                      }}
                    >
                      <label className="sr-only" htmlFor={'comment-' + p.id}>
                        Tu comentario
                      </label>
                      <input
                        id={'comment-' + p.id}
                        name="body"
                        placeholder="Comparte tu perspectiva…"
                        required
                        minLength={2}
                        maxLength={1000}
                      />
                      <button className="btn small">ENVIAR COMENTARIO</button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          ))}
          {!posts.length && !(tab === 'Creaciones' && data.designs.length) && (
            <div className="empty-state">
              <h3>Tu visión puede ser la primera.</h3>
              <p>Comparte una historia o crea una propuesta en tu atelier.</p>
              <Link className="btn" href="/co-creacion">
                Crear una propuesta <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </div>
        <p className="catalog-note">
          El contenido editorial inicial es una propuesta de marca, no
          testimonios de clientes. Publicaciones y comentarios de la comunidad
          requieren cuenta y revisión antes de aparecer aquí.
        </p>
      </div>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Comparte tu historia"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button close"
              aria-label="Cerrar"
              onClick={() => setModal(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">TU VOZ, TU VISIÓN</span>
            <h2 style={{ marginTop: 12 }}>Comparte algo propio.</h2>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                try {
                  await api('posts', {
                    title: f.get('title'),
                    body: f.get('body'),
                    category: f.get('category'),
                  });
                  notify(
                    'Tu historia está guardada y pendiente de moderación.',
                  );
                  setModal(false);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                <span>El título de tu historia</span>
                <input
                  name="title"
                  autoFocus
                  required
                  minLength={3}
                  maxLength={100}
                />
              </label>
              <label className="field">
                <span>Tu perspectiva</span>
                <textarea
                  name="body"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                />
              </label>
              <label className="field">
                <span>Categoría</span>
                <select name="category">
                  <option>Historias</option>
                  <option>Inspiración</option>
                  <option>Creaciones</option>
                </select>
              </label>
              <button className="btn full" disabled={busy}>
                {busy ? 'GUARDANDO…' : 'ENVIAR A REVISIÓN'}{' '}
                <ArrowUpRight size={15} />
              </button>
              <p className="form-note">
                Necesitas una cuenta. Comparte contenido propio, respetuoso y
                sin datos personales de terceros.{' '}
                <Link
                  href="/politicas/comunidad"
                  style={{ textDecoration: 'underline' }}
                >
                  Normas de la comunidad.
                </Link>
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
