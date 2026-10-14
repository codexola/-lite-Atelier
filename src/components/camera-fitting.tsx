'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Pose, Results } from '@mediapipe/pose';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  CameraOff,
  Download,
  Upload,
  ScanLine,
  ShieldCheck,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { type Product, colors, sizes } from '@/lib/catalog';
import {
  garmentAsset,
  garmentSpecs,
  productColors,
} from '@/lib/garment-assets';
import { drawGarment, fitGrid, type Landmark } from '@/lib/camera-fitting';
import { useAtelier } from './atelier-provider';
import { RealisticFitting } from './realistic-fitting';
declare global {
  interface Window {
    Pose?: new (config: { locateFile: (file: string) => string }) => Pose;
  }
}
let poseScript: Promise<void> | undefined;
function loadPose() {
  if (window.Pose) return Promise.resolve();
  if (!poseScript)
    poseScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/models/pose/pose.js';
      script.onload = () =>
        window.Pose
          ? resolve()
          : reject(new Error('No se pudo iniciar el seguimiento.'));
      script.onerror = () => {
        poseScript = undefined;
        script.remove();
        reject(
          new Error(
            'No se pudo cargar el seguimiento. Puedes usar el ajuste manual.',
          ),
        );
      };
      document.head.append(script);
    });
  return poseScript;
}
const manualLandmarks: Landmark[] = Array.from({ length: 33 }, () => ({
  x: 0.5,
  y: 0.5,
  visibility: 1,
}));
for (const [i, x, y] of [
  [11, 0.36, 0.2],
  [12, 0.64, 0.2],
  [13, 0.31, 0.37],
  [14, 0.69, 0.37],
  [15, 0.33, 0.53],
  [16, 0.67, 0.53],
  [23, 0.4, 0.52],
  [24, 0.6, 0.52],
  [25, 0.4, 0.72],
  [26, 0.6, 0.72],
  [27, 0.4, 0.93],
  [28, 0.6, 0.93],
])
  manualLandmarks[i] = { x, y, visibility: 1 };
export function CameraFitting({ products }: { products: Product[] }) {
  const available = products.filter((p) =>
    garmentAsset(p, garmentSpecs[p.slug]?.color || 'Noir'),
  );
  const [selected, setSelected] = useState(available[0]?.id || '');
  const product = available.find((p) => p.id === selected) || available[0];
  const [color, setColor] = useState(
    garmentSpecs[product?.slug]?.color || 'Noir',
  );
  const [size, setSize] = useState('M');
  const [scale, setScale] = useState(1);
  const [manual, setManual] = useState(false);
  const [vertical, setVertical] = useState(0);
  const [facing, setFacing] = useState<'user' | 'environment'>('user'),
    [mirrored, setMirrored] = useState(true);
  const [state, setState] = useState<'idle' | 'loading' | 'camera' | 'photo'>(
    'idle',
  );
  const [tracking, setTracking] = useState('Sin cámara');
  const [error, setError] = useState('');
  const [textureReady, setTextureReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [experience, setExperience] = useState(0);
  const video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    photoImage = useRef<HTMLImageElement | null>(null);
  const stream = useRef<MediaStream | null>(null),
    pose = useRef<Pose | null>(null),
    frame = useRef(0),
    generation = useRef(0);
  const landmarks = useRef<Landmark[]>([]),
    lastPose = useRef(0),
    texture = useRef<HTMLImageElement | null>(null),
    inference = useRef<Promise<void> | null>(null);
  const settings = useRef({ product, color, scale, manual, vertical, state });
  settings.current = { product, color, scale, manual, vertical, state };
  const { add, notify } = useAtelier();
  const source = product ? garmentAsset(product, color) : null;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = available.find((p) => p.slug === params.get('pieza'));
    if (p) {
      setSelected(p.id);
      const requested = params.get('color');
      setColor(
        requested && productColors(p).includes(requested)
          ? requested
          : garmentSpecs[p.slug].color,
      );
    }
    return () => {
      generation.current++;
      cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      const current = pose.current;
      pose.current = null;
      void (inference.current || Promise.resolve())
        .catch(() => {})
        .then(() => current?.close())
        .catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!source) return;
    let active = true;
    setTextureReady(false);
    texture.current = null;
    const image = new window.Image();
    image.onload = () => {
      if (active) {
        texture.current = image;
        setTextureReady(true);
      }
    };
    image.onerror = () => {
      if (active) setError('No pudimos cargar esta prenda. Elige otra pieza.');
    };
    image.src = source;
    return () => {
      active = false;
    };
  }, [source]);
  function stopResources() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    landmarks.current = [];
    lastPose.current = 0;
    const current = pose.current;
    pose.current = null;
    void (inference.current || Promise.resolve())
      .catch(() => {})
      .then(() => current?.close())
      .catch(() => {});
  }
  function stop() {
    setExperience((v) => v + 1);
    stopResources();
    photoImage.current = null;
    setPhoto(null);
    setState('idle');
    setTracking('Sin cámara');
    setError('');
    canvas.current
      ?.getContext('2d')
      ?.clearRect(0, 0, canvas.current.width, canvas.current.height);
  }
  function draw(now: number) {
    const current = settings.current;
    const view = canvas.current;
    const feed = current.state === 'photo' ? photoImage.current : video.current;
    if (view && feed) {
      const width =
          feed instanceof HTMLVideoElement
            ? feed.videoWidth
            : feed.naturalWidth,
        height =
          feed instanceof HTMLVideoElement
            ? feed.videoHeight
            : feed.naturalHeight;
      if (width && height) {
        if (view.width !== width || view.height !== height) {
          view.width = width;
          view.height = height;
        }
        const ctx = view.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          const points = current.manual
            ? manualLandmarks
            : current.state === 'photo' || now - lastPose.current < 900
              ? landmarks.current
              : [];
          const spec = garmentSpecs[current.product?.slug];
          if (spec && texture.current && points.length) {
            const adjusted = points.map((p) => ({
              ...p,
              y: p.y + current.vertical,
            }));
            const grid = fitGrid(
              adjusted,
              width,
              height,
              spec.region,
              spec.sleeves,
              current.scale,
            );
            if (grid) {
              ctx.globalAlpha = 0.96;
              drawGarment(ctx, texture.current, grid);
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    }
    frame.current = requestAnimationFrame(draw);
  }
  async function createDetector(session: number) {
    await loadPose();
    if (session !== generation.current) return;
    const detector = new window.Pose!({
      locateFile: (file) => '/models/pose/' + file,
    });
    pose.current = detector;
    detector.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55,
      selfieMode: false,
    });
    detector.onResults((results: Results) => {
      if (session !== generation.current) return;
      const points = results.poseLandmarks;
      if (points?.length) {
        const previous = landmarks.current;
        landmarks.current = points.map((p, i) => ({
          ...p,
          x: previous[i] ? previous[i].x * 0.55 + p.x * 0.45 : p.x,
          y: previous[i] ? previous[i].y * 0.55 + p.y * 0.45 : p.y,
        }));
        lastPose.current = performance.now();
        const spec = garmentSpecs[settings.current.product?.slug];
        const width =
            video.current?.videoWidth ||
            photoImage.current?.naturalWidth ||
            640,
          height =
            video.current?.videoHeight ||
            photoImage.current?.naturalHeight ||
            960;
        setTracking(
          spec &&
            fitGrid(landmarks.current, width, height, spec.region, spec.sleeves)
            ? 'Cuerpo detectado'
            : 'Muestra hombros, cadera y la zona completa de la prenda',
        );
      } else {
        landmarks.current = [];
        setTracking('Aléjate para mostrar el cuerpo');
      }
    });
    await detector.initialize();
    if (session !== generation.current) {
      await detector.close();
      return;
    }
    setTracking('Buscando tu silueta');
    return detector;
  }
  async function startCamera() {
    stopResources();
    photoImage.current = null;
    setPhoto(null);
    setError('');
    setState('loading');
    setTracking('Preparando el seguimiento');
    const session = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'Este navegador no permite usar la cámara. Puedes cargar una foto.',
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 960 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      if (session !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      video.current!.srcObject = media;
      await video.current!.play();
      setState('camera');
      settings.current.state = 'camera';
      frame.current = requestAnimationFrame(draw);
      try {
        const detector = await createDetector(session);
        if (!detector) return;
        let last = 0;
        async function detect(now: number) {
          if (session !== generation.current) return;
          const feed = video.current;
          if (feed && feed.readyState >= 2 && now - last > 90) {
            last = now;
            try {
              inference.current = detector!.send({ image: feed });
              await inference.current;
            } catch {
              if (session === generation.current) {
                setTracking('Seguimiento no disponible');
                setError('Puedes continuar con el ajuste manual.');
                setManual(true);
              }
              return;
            }
          }
          if (session === generation.current) requestAnimationFrame(detect);
        }
        requestAnimationFrame(detect);
      } catch (e) {
        if (session === generation.current) {
          setError((e as Error).message);
          setTracking('Ajuste manual');
          setManual(true);
        }
      }
    } catch (e) {
      if (session !== generation.current) return;
      stopResources();
      setState('idle');
      const name = (e as Error).name;
      setError(
        name === 'NotAllowedError'
          ? 'El permiso de cámara fue rechazado. Actívalo en tu navegador o carga una foto local.'
          : name === 'NotFoundError'
            ? 'No encontramos una cámara. Puedes cargar una foto.'
            : (e as Error).message,
      );
      setTracking('Sin cámara');
    }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError('Elige una foto JPG, PNG o WebP de hasta 8 MB.');
      return;
    }
    stopResources();
    setError('');
    setState('loading');
    setPhoto(null);
    photoImage.current = null;
    canvas.current
      ?.getContext('2d')
      ?.clearRect(0, 0, canvas.current.width, canvas.current.height);
    const session = generation.current;
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('La foto no se pudo abrir.'));
        image.src = url;
      });
      if (session !== generation.current) return;
      if (image.naturalWidth * image.naturalHeight > 24000000)
        throw new Error(
          'La foto es demasiado grande. Usa una imagen de hasta 24 megapíxeles.',
        );
      photoImage.current = image;
      const preview = document.createElement('canvas');
      preview.width = Math.min(1200, image.naturalWidth);
      preview.height = Math.round(
        (image.naturalHeight / image.naturalWidth) * preview.width,
      );
      preview
        .getContext('2d')!
        .drawImage(image, 0, 0, preview.width, preview.height);
      const local = preview.toDataURL('image/jpeg', 0.88);
      const resized = new window.Image();
      await new Promise<void>((resolve) => {
        resized.onload = () => resolve();
        resized.src = local;
      });
      if (session !== generation.current) return;
      photoImage.current = resized;
      setPhoto(local);
      setState('photo');
      settings.current.state = 'photo';
      frame.current = requestAnimationFrame(draw);
      try {
        const detector = await createDetector(session);
        if (detector) {
          inference.current = detector.send({ image: resized });
          await inference.current;
        }
      } catch {
        if (session !== generation.current) return;
        setManual(true);
        setTracking('Ajuste manual');
        setError(
          'Seguimiento no disponible. Puedes ajustar la prenda manualmente.',
        );
      }
    } catch (e) {
      if (session === generation.current) {
        setState('idle');
        setError((e as Error).message);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function download() {
    const feed =
      settings.current.state === 'photo' ? photoImage.current : video.current;
    if (!feed || !canvas.current || !textureReady) return;
    const output = document.createElement('canvas');
    output.width = canvas.current.width;
    output.height = canvas.current.height;
    const ctx = output.getContext('2d');
    if (!ctx || !output.width) return;
    ctx.drawImage(feed, 0, 0, output.width, output.height);
    ctx.drawImage(canvas.current, 0, 0);
    ctx.fillStyle = '#171a17b3';
    ctx.fillRect(0, output.height - 36, output.width, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      'ÉLITE ATELIER · VISTA PREVIA EXPERIMENTAL',
      14,
      output.height - 14,
    );
    const a = document.createElement('a');
    a.href = output.toDataURL('image/jpeg', 0.92);
    a.download = 'elite-atelier-' + product.slug + '-preview.jpg';
    a.click();
  }
  function capturePhoto() {
    const feed =
      settings.current.state === 'photo' ? photoImage.current : video.current;
    if (!feed || !['camera', 'photo'].includes(settings.current.state))
      return null;
    const width =
        feed instanceof HTMLVideoElement ? feed.videoWidth : feed.naturalWidth,
      height =
        feed instanceof HTMLVideoElement
          ? feed.videoHeight
          : feed.naturalHeight;
    if (!width || !height) return null;
    const output = document.createElement('canvas');
    output.width = Math.min(width, 1200);
    output.height = Math.round((height * output.width) / width);
    output.getContext('2d')!.drawImage(feed, 0, 0, output.width, output.height);
    return output.toDataURL('image/jpeg', 0.88);
  }
  if (!product)
    return (
      <div className="empty-state">
        <h1>Tu probador estará disponible pronto.</h1>
      </div>
    );
  const active = state === 'camera' || state === 'photo';
  return (
    <div className="fitting-page">
      <div className="fitting-heading">
        <div>
          <span className="eyebrow">ÉLITE LAB / TU PROBADOR PERSONAL</span>
          <h1>
            Tu cámara.
            <br />
            <em>Tu próxima expresión.</em>
          </h1>
        </div>
        <p>
          Explora cómo se coloca una silueta sobre ti. El seguimiento se procesa
          en tu dispositivo y se adapta a tus movimientos.
        </p>
      </div>
      <div className="fitting-layout">
        <section
          className="fitting-stage-panel"
          aria-label="Vista previa de la prenda"
        >
          <div className="fitting-status">
            <span>
              <i />
              {active ? 'EN TU DISPOSITIVO' : 'VISTA PREVIA LOCAL'}
            </span>
            <span role="status">{tracking}</span>
          </div>
          <div
            className={
              'fitting-camera ' + (state === 'photo' ? 'photo-mode' : '')
            }
          >
            <div
              className={
                'fitting-feed ' +
                (state === 'photo' || !mirrored ? '' : 'mirrored')
              }
            >
              <video
                ref={video}
                muted
                playsInline
                aria-label="Tu cámara en vivo"
                style={{
                  visibility: state === 'camera' ? 'visible' : 'hidden',
                }}
              />
              {photo && (
                <img src={photo} alt="Tu foto local para la vista previa" />
              )}
              <canvas
                ref={canvas}
                aria-label="Prenda superpuesta sobre tu silueta"
              />
            </div>
            {!active && (
              <div className="fitting-start">
                <div className="fitting-orbit">
                  <ScanLine size={55} strokeWidth={0.8} />
                </div>
                <span className="eyebrow">
                  MIRA LA MODA DESDE TU PERSPECTIVA
                </span>
                <h2>
                  Un espacio para
                  <br />
                  <em>verte diferente.</em>
                </h2>
                <p>
                  Coloca el dispositivo frente a ti, con buena luz y el cuerpo
                  visible. Usa prendas ajustadas para facilitar el seguimiento.
                </p>
                <button
                  className="btn btn-light"
                  onClick={startCamera}
                  disabled={state === 'loading'}
                >
                  <Camera size={17} />
                  {state === 'loading' ? 'PREPARANDO…' : 'ACTIVAR MI CÁMARA'}
                </button>
              </div>
            )}
            {active && !textureReady && (
              <span className="fitting-texture-status">
                Cargando la prenda…
              </span>
            )}
            {active && !manual && tracking !== 'Cuerpo detectado' && (
              <div className="fitting-body-guide">
                <ScanLine size={48} strokeWidth={0.8} />
                <span>
                  Muestra hombros, cadera y la zona de la prenda.
                  <br />
                  Mantén buena luz y separa ligeramente los brazos.
                </span>
              </div>
            )}
            {active && (
              <div className="fitting-view-label">
                <span>
                  {product.name} / {color}
                </span>
                <small>
                  {manual ? 'POSICIÓN MANUAL' : 'SEGUIMIENTO AUTOMÁTICO'}
                </small>
              </div>
            )}
          </div>
          <div className="fitting-stage-actions">
            <label className="btn btn-outline">
              <Upload size={16} /> USAR MI FOTO
              <input
                aria-label="Subir foto local"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={upload}
              />
            </label>
            {active ? (
              <>
                <button
                  className="icon-button"
                  aria-label="Descargar vista previa"
                  onClick={download}
                  disabled={
                    !textureReady ||
                    (!manual && tracking !== 'Cuerpo detectado')
                  }
                >
                  <Download size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Apagar cámara y borrar foto"
                  onClick={stop}
                >
                  <CameraOff size={18} />
                </button>
              </>
            ) : (
              <span>
                <ShieldCheck size={15} /> Tu imagen permanece aquí.
              </span>
            )}
          </div>
          {error && (
            <p className="fitting-error" role="alert">
              {error}
            </p>
          )}
          <p className="fitting-disclaimer">
            Vista experimental con superposición 2D guiada por IA. No reproduce
            caída, tejido, oclusión o tallaje real, y no es un render
            fotorealista.
          </p>
        </section>
        <section className="fitting-wardrobe">
          <div className="fitting-wardrobe-title">
            <span className="eyebrow">01 / ELIGE TU SILUETA</span>
            <span>{available.length} piezas</span>
          </div>
          <div
            className="fitting-garment-list"
            role="group"
            aria-label="Prendas para probar"
          >
            {available.map((p) => (
              <button
                key={p.id}
                aria-pressed={product.id === p.id}
                aria-label={'Probar ' + p.name}
                className={product.id === p.id ? 'selected' : ''}
                onClick={() => {
                  setSelected(p.id);
                  setColor(garmentSpecs[p.slug].color);
                  setScale(1);
                }}
              >
                <Image src={p.image} alt="" width={90} height={110} />
                <span>
                  {p.name}
                  <small>{p.category}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="fitting-selection">
            <h2>{product.name}</h2>
            <span className="eyebrow">
              {product.collection} / {color}
            </span>
            <div className="color-options">
              {colors
                .filter((c) => productColors(product).includes(c.name))
                .map((c) => (
                  <button
                    key={c.name}
                    aria-label={'Color ' + c.name}
                    aria-pressed={color === c.name}
                    className={
                      'color-option ' + (color === c.name ? 'selected' : '')
                    }
                    style={{ background: c.hex }}
                    onClick={() => setColor(c.name)}
                  />
                ))}
            </div>
            <div className="size-options">
              {sizes.map((s) => (
                <button
                  key={s}
                  aria-pressed={size === s}
                  className={size === s ? 'selected' : ''}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <small>
              La talla se guarda en tu selección; no calcula medidas corporales
              desde la cámara.
            </small>
            <button
              className="btn full"
              onClick={() => add(product, size, color)}
            >
              AÑADIR A MI SELECCIÓN <ArrowUpRight size={16} />
            </button>
            <Link
              className="text-link"
              href={
                '/producto/' +
                product.slug +
                '?color=' +
                color +
                '&talla=' +
                size
              }
            >
              Ver la ficha completa <ArrowUpRight size={14} />
            </Link>
          </div>
          <details className="fitting-adjust">
            <summary>Ajustar la vista previa</summary>
            <label>
              Cámara preferida
              <select
                aria-label="Cámara preferida"
                value={facing}
                onChange={(e) =>
                  setFacing(e.target.value as 'user' | 'environment')
                }
              >
                <option value="user">Frontal</option>
                <option value="environment">Trasera</option>
              </select>
            </label>
            <small>Apaga y vuelve a activar para cambiar la cámara.</small>
            <label>
              <input
                type="checkbox"
                checked={mirrored}
                onChange={(e) => setMirrored(e.target.checked)}
              />
              Vista espejo
            </label>
            <label>
              <input
                type="checkbox"
                checked={manual}
                onChange={(e) => setManual(e.target.checked)}
              />{' '}
              Posición manual con guía fija
            </label>
            <label>
              Escala visual: {Math.round(scale * 100)}%
              <input
                aria-label="Escala visual de la prenda"
                type="range"
                min="0.8"
                max="1.2"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </label>
            <label>
              Altura de la superposición
              <input
                aria-label="Altura de la superposición"
                type="range"
                min="-0.12"
                max="0.12"
                step="0.01"
                value={vertical}
                onChange={(e) => setVertical(Number(e.target.value))}
              />
            </label>
            <button
              className="text-link"
              onClick={() => {
                setScale(1);
                setVertical(0);
              }}
            >
              <RotateCcw size={14} /> Restablecer ajustes
            </button>
          </details>
        </section>
      </div>
      <RealisticFitting
        key={experience}
        product={product}
        color={color}
        capture={capturePhoto}
      />
    </div>
  );
}
