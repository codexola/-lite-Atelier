import Fashn from 'fashn';
import { HttpError } from './http';
import { garmentSpecs } from './garment-assets';
import type { Product } from './catalog';
export function tryOnConfiguration() {
  const selfHosted = process.env.TRY_ON_PROVIDER === 'self-hosted';
  let validEndpoint = false;
  try {
    const url = new URL(process.env.VTON_SERVICE_URL || '');
    validEndpoint =
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/';
  } catch {}
  return {
    provider: selfHosted ? 'FASHN VTON 1.5 · servidor privado' : 'FASHN',
    configured:
      (!process.env.TRY_ON_PROVIDER ||
        ['fashn', 'self-hosted'].includes(process.env.TRY_ON_PROVIDER)) &&
      (selfHosted
        ? validEndpoint && (process.env.VTON_SERVICE_KEY?.length || 0) >= 32
        : !!process.env.FASHN_API_KEY),
    model: selfHosted ? 'fashn-vton-1.5' : 'tryon-max',
    localPreview: true,
  };
}
export function providerClient() {
  const config = tryOnConfiguration();
  if (!config.configured)
    throw new HttpError(
      503,
      'El probador realista necesita configurar su servicio. La cámara local sigue disponible.',
    );
  const selfHosted = config.model === 'fashn-vton-1.5';
  return new Fashn({
    apiKey: selfHosted
      ? process.env.VTON_SERVICE_KEY!
      : process.env.FASHN_API_KEY!,
    ...(selfHosted ? { baseURL: process.env.VTON_SERVICE_URL! } : {}),
    maxRetries: 0,
    timeout: 20000,
    logLevel: 'off',
  });
}
export function predictionReference(value: string) {
  if (value.startsWith('vton:')) {
    if (tryOnConfiguration().model !== 'fashn-vton-1.5')
      throw new HttpError(
        409,
        'El servicio cambió. Inicia una nueva experiencia.',
      );
    return value.slice(5);
  }
  if (tryOnConfiguration().model !== 'tryon-max')
    throw new HttpError(
      409,
      'El servicio cambió. Inicia una nueva experiencia.',
    );
  return value;
}
export function inferenceCategory(
  product: Pick<Product, 'slug' | 'name' | 'category'>,
) {
  if (
    /\b(vestidos?|monos?|enterizos?)\b/i.test(
      product.name + ' ' + product.category,
    )
  )
    return 'one-pieces';
  if (
    ['lower', 'skirt'].includes(garmentSpecs[product.slug]?.region) ||
    /pantal[oó]n|falda|short/i.test(product.name + ' ' + product.category)
  )
    return 'bottoms';
  return 'tops';
}
