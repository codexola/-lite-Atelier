export function publicSettings() {
  const requested = process.env.COMMERCE_MODE === 'live';
  const approved = process.env.LAUNCH_APPROVED === 'true';
  const fee = Number(process.env.SHIPPING_FEE_COP || 25000) * 100;
  const freeAt = Number(process.env.FREE_SHIPPING_COP || 1200000) * 100;
  const shipping = {
    fee: Number.isSafeInteger(fee) && fee >= 0 ? fee : 2500000,
    freeAt: Number.isSafeInteger(freeAt) && freeAt >= 0 ? freeAt : 120000000,
  };
  return {
    mode: requested && approved ? 'live' : 'preview',
    shipping,
    currency: 'COP',
    country: 'CO',
  };
}
