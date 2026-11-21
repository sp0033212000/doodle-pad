import type { Point, Rect } from '../types';

/** 選取範圍：外框矩形 + 矩形內的遮罩（1 = 選取） */
export interface Region extends Rect {
  mask: Uint8Array;
}

/** 純資料的選取遮罩運算，不依賴 DOM，可直接單元測試 */

export function rectRegion(a: Point, b: Point, bounds: { w: number; h: number }): Region | null {
  const clampX = (v: number) => Math.max(0, Math.min(bounds.w, v));
  const clampY = (v: number) => Math.max(0, Math.min(bounds.h, v));
  const x0 = clampX(Math.min(a.x, b.x)),
    x1 = clampX(Math.max(a.x, b.x));
  const y0 = clampY(Math.min(a.y, b.y)),
    y1 = clampY(Math.max(a.y, b.y));
  const w = x1 - x0,
    h = y1 - y0;
  if (w < 1 || h < 1) return null;
  return { x: x0, y: y0, w, h, mask: new Uint8Array(w * h).fill(1) };
}

/** 由整張畫布大小的遮罩裁出外框範圍 */
export function regionFromFullMask(full: Uint8Array, fullWidth: number): Region | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -1,
    y1 = -1;
  for (let k = 0; k < full.length; k++) {
    if (!full[k]) continue;
    const x = k % fullWidth,
      y = (k / fullWidth) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1,
    h = y1 - y0 + 1;
  const mask = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    const from = (y0 + j) * fullWidth + x0;
    mask.set(full.subarray(from, from + w), j * w);
  }
  return { x: x0, y: y0, w, h, mask };
}

export function regionContains(r: Region | null, p: Point): boolean {
  if (!r) return false;
  const i = p.x - r.x,
    j = p.y - r.y;
  return i >= 0 && j >= 0 && i < r.w && j < r.h && r.mask[j * r.w + i] === 1;
}

/** 遮罩邊界線段（合併同一直線上的連續邊）；回傳 [x1, y1, x2, y2] 陣列 */
export function regionOutline({ x, y, w, h, mask }: Region): [number, number, number, number][] {
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && mask[j * w + i] === 1;
  const segs: [number, number, number, number][] = [];
  for (let j = 0; j <= h; j++) {
    let run = -1;
    for (let i = 0; i <= w; i++) {
      const edge = i < w && at(i, j - 1) !== at(i, j);
      if (edge && run < 0) run = i;
      if (!edge && run >= 0) {
        segs.push([x + run, y + j, x + i, y + j]);
        run = -1;
      }
    }
  }
  for (let i = 0; i <= w; i++) {
    let run = -1;
    for (let j = 0; j <= h; j++) {
      const edge = j < h && at(i - 1, j) !== at(i, j);
      if (edge && run < 0) run = j;
      if (!edge && run >= 0) {
        segs.push([x + i, y + run, x + i, y + j]);
        run = -1;
      }
    }
  }
  return segs;
}
