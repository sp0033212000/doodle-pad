import type { App, Point, ShapeMode, Tool, ToolSession } from '../types';
import { colorFor, otherColor } from './helpers';

type ShapeKind = 'line' | 'rect' | 'ellipse';

interface ShapeOptions {
  stroke: string;
  fill: string;
  size: number;
  mode: ShapeMode;
  shift: boolean;
}

/** 依 Shift 限制：直線鎖 45°，矩形/橢圓鎖正方形/正圓 */
export function constrain(kind: ShapeKind, a: Point, b: Point): Point {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  if (kind === 'line') {
    const step = Math.PI / 4;
    const ang = Math.round(Math.atan2(dy, dx) / step) * step;
    const len = Math.hypot(dx, dy);
    return { x: a.x + Math.round(Math.cos(ang) * len), y: a.y + Math.round(Math.sin(ang) * len) };
  }
  const s = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + Math.sign(dx || 1) * s, y: a.y + Math.sign(dy || 1) * s };
}

export function drawShape(c: CanvasRenderingContext2D, kind: ShapeKind, a: Point, b: Point, o: ShapeOptions) {
  if (o.shift) b = constrain(kind, a, b);
  c.lineWidth = o.size;
  c.lineCap = 'round';
  c.lineJoin = 'miter';

  if (kind === 'line') {
    c.strokeStyle = o.stroke;
    c.beginPath();
    c.moveTo(a.x + 0.5, a.y + 0.5);
    c.lineTo(b.x + 0.5, b.y + 0.5);
    c.stroke();
    return;
  }

  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x),
    h = Math.abs(b.y - a.y);
  c.beginPath();
  if (kind === 'rect') c.rect(x + 0.5, y + 0.5, w, h);
  else c.ellipse(x + w / 2 + 0.5, y + h / 2 + 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);

  if (o.mode === 'fill') {
    c.fillStyle = o.stroke;
    c.fill();
  }
  if (o.mode === 'both') {
    c.fillStyle = o.fill;
    c.fill();
  }
  if (o.mode !== 'fill') {
    c.strokeStyle = o.stroke;
    c.stroke();
  }
}

const optionsFor = (app: App, s: ToolSession): ShapeOptions => ({
  stroke: colorFor(app, s.button),
  fill: otherColor(app, s.button),
  size: app.store.get('size'),
  mode: app.store.get('shapeMode'),
  shift: s.shift,
});

function makeShapeTool(id: ShapeKind, name: string, icon: string, key: string): Tool {
  return {
    id,
    name,
    icon,
    key,
    cursor: 'crosshair',
    onMove(app, p, s) {
      app.canvas.clearOverlay();
      drawShape(app.canvas.octx, id, s.start, p, optionsFor(app, s));
    },
    onUp(app, p, s) {
      app.canvas.clearOverlay();
      drawShape(app.canvas.ctx, id, s.start, p, optionsFor(app, s));
    },
  };
}

export const line = makeShapeTool('line', '直線', '╱', 'l');
export const rect = makeShapeTool('rect', '矩形', '▭', 'r');
export const ellipse = makeShapeTool('ellipse', '橢圓', '◯', 'o');
