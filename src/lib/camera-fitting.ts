import type { GarmentRegion } from './garment-assets';
export type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};
export type Point = { x: number; y: number };
const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export function fitGrid(
  landmarks: Landmark[],
  width: number,
  height: number,
  region: GarmentRegion,
  sleeves: boolean,
  adjust = 1,
): Point[][] | null {
  const required = [11, 12, 23, 24];
  if (region !== 'upper') required.push(25, 26);
  if (region === 'lower' || region === 'full' || region === 'skirt')
    required.push(27, 28);
  if (sleeves && region === 'upper') required.push(13, 14, 15, 16);
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(width + height + adjust) ||
    adjust <= 0 ||
    required.some(
      (i) =>
        !landmarks[i] ||
        (landmarks[i].visibility ?? 1) < 0.45 ||
        !Number.isFinite(landmarks[i].x + landmarks[i].y),
    )
  )
    return null;
  const p = (i: number): Point => ({
    x: landmarks[i].x * width,
    y: landmarks[i].y * height,
  });
  const left = landmarks[11].x < landmarks[12].x ? 11 : 12,
    right = left === 11 ? 12 : 11;
  const leftHip = left === 11 ? 23 : 24,
    rightHip = left === 11 ? 24 : 23;
  const shoulderL = p(left),
    shoulderR = p(right),
    hipL = p(leftHip),
    hipR = p(rightHip);
  const shoulderWidth = Math.hypot(
    shoulderR.x - shoulderL.x,
    shoulderR.y - shoulderL.y,
  );
  const torso = Math.hypot(
    (hipL.x + hipR.x - shoulderL.x - shoulderR.x) / 2,
    (hipL.y + hipR.y - shoulderL.y - shoulderR.y) / 2,
  );
  if (shoulderWidth < width * 0.06 || torso < height * 0.08) return null;
  const row = (l: Point, r: Point, expansion: number): Point[] => {
    const center = mix(l, r, 0.5);
    return [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const q = mix(l, r, t);
      return { x: center.x + (q.x - center.x) * expansion * adjust, y: q.y };
    });
  };
  if (region === 'lower' || region === 'skirt') {
    const kneeL = p(left === 11 ? 25 : 26),
      kneeR = p(left === 11 ? 26 : 25),
      ankleL = p(left === 11 ? 27 : 28),
      ankleR = p(left === 11 ? 28 : 27);
    return [
      row(
        { x: hipL.x, y: hipL.y - torso * 0.12 },
        { x: hipR.x, y: hipR.y - torso * 0.12 },
        1.35,
      ),
      row(mix(hipL, kneeL, 0.65), mix(hipR, kneeR, 0.65), 1.5),
      row(kneeL, kneeR, 1.6),
      region === 'skirt'
        ? row(mix(kneeL, ankleL, 0.45), mix(kneeR, ankleR, 0.45), 2.1)
        : row(
            { x: ankleL.x, y: ankleL.y + torso * 0.12 },
            { x: ankleR.x, y: ankleR.y + torso * 0.12 },
            1.8,
          ),
    ];
  }
  const top = row(
    { x: shoulderL.x, y: shoulderL.y - torso * 0.12 },
    { x: shoulderR.x, y: shoulderR.y - torso * 0.12 },
    1.22,
  );
  const middle = row(
    mix(shoulderL, hipL, 0.42),
    mix(shoulderR, hipR, 0.42),
    1.17,
  );
  const waist = row(
    mix(shoulderL, hipL, 0.78),
    mix(shoulderR, hipR, 0.78),
    1.15,
  );
  let bottom = row(
    { x: hipL.x, y: hipL.y + torso * 0.13 },
    { x: hipR.x, y: hipR.y + torso * 0.13 },
    1.15,
  );
  if (region === 'dress' || region === 'full') {
    const kneeL = p(left === 11 ? 25 : 26),
      kneeR = p(left === 11 ? 26 : 25);
    bottom = row(
      { x: kneeL.x, y: kneeL.y + torso * 0.22 },
      { x: kneeR.x, y: kneeR.y + torso * 0.22 },
      1.7,
    );
    if (region === 'full')
      bottom = row(p(left === 11 ? 27 : 28), p(left === 11 ? 28 : 27), 1.8);
  }
  if (sleeves && region === 'upper') {
    const elbowL = p(left === 11 ? 13 : 14),
      elbowR = p(left === 11 ? 14 : 13),
      wristL = p(left === 11 ? 15 : 16),
      wristR = p(left === 11 ? 16 : 15);
    const spread = (l: Point, r: Point, yOffset = 0): Point[] => {
      const center = mix(l, r, 0.5);
      const innerL = {
        x: center.x + (l.x - center.x) * 1.12 * adjust,
        y: l.y + yOffset,
      };
      const innerR = {
        x: center.x + (r.x - center.x) * 1.12 * adjust,
        y: r.y + yOffset,
      };
      return [
        { x: innerL.x - shoulderWidth * 0.22 * adjust, y: innerL.y },
        innerL,
        mix(innerL, innerR, 0.5),
        innerR,
        { x: innerR.x + shoulderWidth * 0.22 * adjust, y: innerR.y },
      ];
    };
    const upper = spread(shoulderL, shoulderR, -torso * 0.07),
      chest = spread(mix(shoulderL, hipL, 0.4), mix(shoulderR, hipR, 0.4));
    const lower = spread(
        mix(shoulderL, hipL, 0.78),
        mix(shoulderR, hipR, 0.78),
      ),
      hem = spread(hipL, hipR, torso * 0.14);
    chest[0] = { x: elbowL.x - shoulderWidth * 0.08, y: elbowL.y };
    chest[4] = { x: elbowR.x + shoulderWidth * 0.08, y: elbowR.y };
    lower[0] = { x: wristL.x - shoulderWidth * 0.08, y: wristL.y };
    lower[4] = { x: wristR.x + shoulderWidth * 0.08, y: wristR.y };
    hem[0] = mix(
      hem[0],
      { x: wristL.x - shoulderWidth * 0.07, y: wristL.y },
      0.7,
    );
    hem[4] = mix(
      hem[4],
      { x: wristR.x + shoulderWidth * 0.07, y: wristR.y },
      0.7,
    );
    return [upper, chest, lower, hem];
  }
  return [top, middle, waist, bottom];
}
export function drawTriangle(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  source: [Point, Point, Point],
  target: [Point, Point, Point],
) {
  const [s0, s1, s2] = source,
    [d0, d1, d2] = target;
  const det =
    s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(det) < 0.001 || target.some((p) => !Number.isFinite(p.x + p.y)))
    return;
  const coefficients = (a: number, b: number, c: number) => [
    (a * (s1.y - s2.y) + b * (s2.y - s0.y) + c * (s0.y - s1.y)) / det,
    (a * (s2.x - s1.x) + b * (s0.x - s2.x) + c * (s1.x - s0.x)) / det,
    (a * (s1.x * s2.y - s2.x * s1.y) +
      b * (s2.x * s0.y - s0.x * s2.y) +
      c * (s0.x * s1.y - s1.x * s0.y)) /
      det,
  ];
  const x = coefficients(d0.x, d1.x, d2.x),
    y = coefficients(d0.y, d1.y, d2.y);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(x[0], y[0], x[1], y[1], x[2], y[2]);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}
export function drawGarment(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  grid: Point[][],
) {
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const s = (x: number, y: number): Point => ({
        x: (x / 4) * image.naturalWidth,
        y: (y / 3) * image.naturalHeight,
      });
      drawTriangle(
        ctx,
        image,
        [s(col, row), s(col + 1, row), s(col + 1, row + 1)],
        [grid[row][col], grid[row][col + 1], grid[row + 1][col + 1]],
      );
      drawTriangle(
        ctx,
        image,
        [s(col, row), s(col + 1, row + 1), s(col, row + 1)],
        [grid[row][col], grid[row + 1][col + 1], grid[row + 1][col]],
      );
    }
}
