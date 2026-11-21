import { h } from '../utils/dom.js';

/**
 * 管理主畫布 (draw) 與預覽層 (overlay)。
 * 工具只透過這裡提供的 API 操作畫布。
 */
export function createCanvas(app) {
  const canvas = h('canvas', { id: 'draw' });
  const overlay = h('canvas', { id: 'overlay' });
  const holder = h('div', { class: 'canvas-holder' }, canvas, overlay);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const octx = overlay.getContext('2d');

  const api = {
    holder, canvas, ctx, overlay, octx,

    get width() { return canvas.width; },
    get height() { return canvas.height; },

    snapshot: () => ctx.getImageData(0, 0, canvas.width, canvas.height),

    restore(img) {
      if (img.width !== canvas.width || img.height !== canvas.height) {
        api.setSize(img.width, img.height, false);
      }
      ctx.putImageData(img, 0, 0);
    },

    /** 調整大小；keep=true 時保留原有內容 */
    setSize(w, h, keep = true) {
      const old = keep ? api.snapshot() : null;
      canvas.width = overlay.width = w;
      canvas.height = overlay.height = h;
      api.clear();
      if (old) ctx.putImageData(old, 0, 0);
      app.store.set('canvasSize', { w, h });
    },

    clear() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    clearOverlay() {
      octx.clearRect(0, 0, overlay.width, overlay.height);
    },

    /** 只改變預覽層大小（拖曳調整畫布時使用） */
    resizeOverlay(w, h) {
      overlay.width = w;
      overlay.height = h;
    },

    /** 滑鼠事件 → 畫布像素座標 */
    toPos(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.floor((e.clientX - r.left) * canvas.width / r.width),
        y: Math.floor((e.clientY - r.top) * canvas.height / r.height),
      };
    },

    toDataURL: (type = 'image/png') => canvas.toDataURL(type),
  };

  return api;
}
