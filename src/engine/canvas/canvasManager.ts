import type { App, PixelBuffer, Point } from '../types';
import type { CanvasPort } from '../core/history';
import { h } from '../utils/dom';

/**
 * 管理主畫布 (draw) 與預覽層 (overlay)。
 * 工具只透過這裡提供的 API 操作畫布；同時實作復原紀錄所需的 CanvasPort。
 */
export function createCanvas(app: Pick<App, 'store'>) {
  const canvas = h('canvas', { id: 'draw' });
  const overlay = h('canvas', { id: 'overlay' });
  const holder = h('div', { class: 'canvas-holder' }, canvas, overlay);

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const octx = overlay.getContext('2d')!;

  const toImageData = (buf: PixelBuffer) =>
    buf instanceof ImageData ? buf : new ImageData(new Uint8ClampedArray(buf.data), buf.width, buf.height);

  const api = {
    holder,
    canvas,
    ctx,
    overlay,
    octx,

    get width() {
      return canvas.width;
    },
    get height() {
      return canvas.height;
    },

    getPixels: (x: number, y: number, w: number, hh: number): PixelBuffer => ctx.getImageData(x, y, w, hh),

    putPixels(buf: PixelBuffer, x: number, y: number) {
      ctx.putImageData(toImageData(buf), x, y);
    },

    /** 調整大小；keep=true 時保留原有內容，否則清成白色 */
    setSize(w: number, hh: number, keep = true) {
      const old = keep ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
      canvas.width = overlay.width = w;
      canvas.height = overlay.height = hh;
      api.clear();
      if (old) ctx.putImageData(old, 0, 0);
      app.store.set('canvasSize', { w, h: hh });
    },

    clear() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    clearOverlay() {
      octx.clearRect(0, 0, overlay.width, overlay.height);
      overlay.style.opacity = '';
    },

    /** 只改變預覽層大小（拖曳調整畫布時使用） */
    resizeOverlay(w: number, hh: number) {
      overlay.width = w;
      overlay.height = hh;
    },

    /** 指標事件 → 畫布像素座標（已考慮縮放） */
    toPos(e: { clientX: number; clientY: number }): Point {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.floor(((e.clientX - r.left) * canvas.width) / r.width),
        y: Math.floor(((e.clientY - r.top) * canvas.height) / r.height),
      };
    },

    toDataURL: (type = 'image/png') => canvas.toDataURL(type),
  };

  return api satisfies CanvasPort & Record<string, unknown>;
}

export type CanvasManager = ReturnType<typeof createCanvas>;
