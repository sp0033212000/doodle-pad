import type { App, Point, Tool, ToolSession } from '../types';
import { otherColor, strokeSegment } from './helpers';

const eraserSize = (app: App) => app.store.get('size') * 2;

function preview(app: App, p: Point) {
  const { octx } = app.canvas;
  const s = eraserSize(app);
  app.canvas.clearOverlay();
  octx.strokeStyle = '#000';
  octx.lineWidth = 1;
  octx.strokeRect(p.x - s / 2 + 0.5, p.y - s / 2 + 0.5, s, s);
}

// 橡皮擦以「次色」擦除（右鍵則用主色），與傳統小畫家相同
const erase = (app: App, a: Point, b: Point, s: ToolSession) =>
  strokeSegment(app.canvas.ctx, a, b, otherColor(app, s.button), eraserSize(app), 'square');

const eraser: Tool = {
  id: 'eraser',
  name: '橡皮擦',
  icon: '🩹',
  key: 'e',
  cursor: 'crosshair',
  onDown(app, p, s) {
    erase(app, p, p, s);
  },
  onMove(app, p, s) {
    erase(app, s.last, p, s);
    preview(app, p);
  },
  onHover: preview,
};

export default eraser;
