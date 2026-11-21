import { hexToRgba } from './color.js';
import { FILL_TOLERANCE } from '../config.js';

/**
 * Scanline flood：從 (sx, sy) 找出顏色相近且相連的區域。
 * 回傳與畫布同尺寸的遮罩 Uint8Array（1 = 在區域內），起點超出範圍時回傳 null。
 * 油漆桶與魔術棒共用。
 */
export function floodRegion(img, sx, sy, tol = FILL_TOLERANCE) {
  const { width: w, height: h, data: d } = img;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;

  const i0 = (sy * w + sx) * 4;
  const [tr, tg, tb, ta] = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const match = i =>
    Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol &&
    Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol;

  const mask = new Uint8Array(w * h);
  const stack = [[sx, sy]];

  while (stack.length) {
    let [x, y] = stack.pop();
    while (x >= 0 && !mask[y * w + x] && match((y * w + x) * 4)) x--;
    x++;
    let up = false, down = false;

    while (x < w && !mask[y * w + x] && match((y * w + x) * 4)) {
      const p = y * w + x, i = p * 4;
      mask[p] = 1;
      if (y > 0) {
        const ok = !mask[p - w] && match(i - w * 4);
        if (ok && !up) { stack.push([x, y - 1]); up = true; } else if (!ok) up = false;
      }
      if (y < h - 1) {
        const ok = !mask[p + w] && match(i + w * 4);
        if (ok && !down) { stack.push([x, y + 1]); down = true; } else if (!ok) down = false;
      }
      x++;
    }
  }
  return mask;
}

/** 油漆桶：把相連區域填成指定顏色 */
export function floodFill(ctx, sx, sy, hex, tol = FILL_TOLERANCE) {
  const { width: w, height: h } = ctx.canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const mask = floodRegion(img, sx, sy, tol);
  if (!mask) return;
  const [r, g, b, a] = hexToRgba(hex);
  const d = img.data;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
}
