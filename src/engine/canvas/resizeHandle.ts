import type { App } from '../types';
import { h } from '../utils/dom';
import { CANVAS_MIN } from '../config';

/** 畫布右下角的拖曳把手 */
export function createResizeHandle(app: App) {
  const handle = h('div', { class: 'resize-handle', title: '拖曳調整畫布大小' });
  const c = app.canvas;
  let start: { x: number; y: number; w: number; h: number } | null = null;

  handle.addEventListener('pointerdown', e => {
    app.finishPending();
    start = { x: e.clientX, y: e.clientY, w: c.width, h: c.height };
    handle.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });

  handle.addEventListener('pointermove', e => {
    if (!start) return;
    const z = app.store.get('zoom');
    const w = Math.max(CANVAS_MIN, Math.round(start.w + (e.clientX - start.x) / z));
    const hgt = Math.max(CANVAS_MIN, Math.round(start.h + (e.clientY - start.y) / z));
    c.resizeOverlay(w, hgt);
    c.octx.setLineDash([4, 4]);
    c.octx.strokeStyle = '#2f6fde';
    c.octx.strokeRect(0.5, 0.5, w - 1, hgt - 1);
    app.store.set('canvasSize', { w, h: hgt });
  });

  handle.addEventListener('pointerup', () => {
    if (!start) return;
    start = null;
    const { width: w, height: hgt } = c.overlay;
    c.octx.setLineDash([]);
    if (w !== c.width || hgt !== c.height) {
      app.history.push();
      c.setSize(w, hgt, true);
    } else {
      c.clearOverlay();
    }
  });

  return handle;
}
