import type { PixelBuffer } from '../types';
import { hexToRgba } from './color';
import { FILL_TOLERANCE } from '../config';

/**
 * Scanline flood：從 (sx, sy) 找出顏色相近且相連的區域。
 * 回傳與畫布同尺寸的遮罩（1 = 在區域內），起點超出範圍時回傳 null。
 * 油漆桶與魔術棒共用；純資料運算，可直接單元測試。
 */
export function floodRegion(
  img: PixelBuffer,
  sx: number,
  sy: number,
  tol = FILL_TOLERANCE,
): Uint8Array | null {
  const { width: w, height: h, data: d } = img;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;

  const i0 = (sy * w + sx) * 4;
  const [tr, tg, tb, ta] = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const match = (i: number) =>
    Math.abs(d[i] - tr) <= tol &&
    Math.abs(d[i + 1] - tg) <= tol &&
    Math.abs(d[i + 2] - tb) <= tol &&
    Math.abs(d[i + 3] - ta) <= tol;

  const mask = new Uint8Array(w * h);
  const stack: [number, number][] = [[sx, sy]];

  while (stack.length) {
    const [startX, y] = stack.pop()!;
    let x = startX;
    while (x >= 0 && !mask[y * w + x] && match((y * w + x) * 4)) x--;
    x++;
    let up = false,
      down = false;

    while (x < w && !mask[y * w + x] && match((y * w + x) * 4)) {
      const p = y * w + x,
        i = p * 4;
      mask[p] = 1;
      if (y > 0) {
        const ok = !mask[p - w] && match(i - w * 4);
        if (ok && !up) {
          stack.push([x, y - 1]);
          up = true;
        } else if (!ok) up = false;
      }
      if (y < h - 1) {
        const ok = !mask[p + w] && match(i + w * 4);
        if (ok && !down) {
          stack.push([x, y + 1]);
          down = true;
        } else if (!ok) down = false;
      }
      x++;
    }
  }
  return mask;
}

/** 依遮罩把像素填成指定顏色（直接修改 img） */
export function fillMask(img: PixelBuffer, mask: Uint8Array, hex: string): void {
  const [r, g, b, a] = hexToRgba(hex);
  const d = img.data;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = a;
  }
}

/** 油漆桶：把相連區域填成指定顏色 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hex: string,
  tol = FILL_TOLERANCE,
): void {
  const { width: w, height: h } = ctx.canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const mask = floodRegion(img, sx, sy, tol);
  if (!mask) return;
  fillMask(img, mask, hex);
  ctx.putImageData(img, 0, 0);
}
