import type { PixelBuffer, Rect } from '../types';

/** 純資料的像素操作，不依賴 DOM，可直接單元測試 */

export function createBuffer(width: number, height: number, data?: Uint8ClampedArray): PixelBuffer {
  return { width, height, data: data ?? new Uint8ClampedArray(width * height * 4) };
}

/** 從 src 裁出一塊（超出範圍的部分會被忽略） */
export function cropBuffer(src: PixelBuffer, x: number, y: number, w: number, h: number): PixelBuffer {
  const out = createBuffer(w, h);
  for (let j = 0; j < h; j++) {
    const sy = y + j;
    if (sy < 0 || sy >= src.height) continue;
    const from = (sy * src.width + x) * 4;
    out.data.set(src.data.subarray(from, from + w * 4), j * w * 4);
  }
  return out;
}

/** 把 patch 寫進 target 的 (x, y) */
export function pasteBuffer(target: PixelBuffer, patch: PixelBuffer, x: number, y: number): void {
  for (let j = 0; j < patch.height; j++) {
    const ty = y + j;
    if (ty < 0 || ty >= target.height) continue;
    const row = patch.data.subarray(j * patch.width * 4, (j + 1) * patch.width * 4);
    target.data.set(row, (ty * target.width + x) * 4);
  }
}

/** 兩張同尺寸緩衝區之間有差異的外框；完全相同時回傳 null */
export function diffBounds(a: PixelBuffer, b: PixelBuffer): Rect | null {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error('diffBounds: size mismatch');
  }
  const { width: w, height: h } = a;
  // 以 32 位元一次比較一個像素
  const av = new Uint32Array(a.data.buffer, a.data.byteOffset, w * h);
  const bv = new Uint32Array(b.data.buffer, b.data.byteOffset, w * h);
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (av[row + x] !== bv[row + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const bufferBytes = (b: PixelBuffer | null | undefined): number => b?.data.byteLength ?? 0;
