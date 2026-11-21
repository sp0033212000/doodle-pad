import type { App, Point, Tool } from '../types';
import { colorFor } from './helpers';

/**
 * 鉛筆：硬邊、無反鋸齒的方形筆尖，大小 = 粗細設定。
 * （筆刷則是圓形、平滑的筆觸）
 */
function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const o = Math.floor(size / 2);
  ctx.fillRect(x - o, y - o, size, size);
}

/** 沿線段逐點蓋章，確保快速移動時不會斷線 */
function drawLine(app: App, a: Point, b: Point, button: number) {
  const { ctx } = app.canvas;
  const size = app.store.get('size');
  ctx.fillStyle = colorFor(app, button);
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  if (n === 0) return stamp(ctx, a.x, a.y, size);
  for (let i = 0; i <= n; i++) {
    stamp(ctx, a.x + Math.round((dx * i) / n), a.y + Math.round((dy * i) / n), size);
  }
}

const pencil: Tool = {
  id: 'pencil',
  name: '鉛筆',
  icon: '✏️',
  key: 'p',
  cursor: 'crosshair',
  onDown(app, p, s) {
    drawLine(app, p, p, s.button);
  },
  onMove(app, p, s) {
    drawLine(app, s.last, p, s.button);
  },
};

export default pencil;
