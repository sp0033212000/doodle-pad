import { colorFor, otherColor } from './helpers.js';

/** 依 Shift 限制：直線鎖 45°，矩形/橢圓鎖正方形/正圓 */
function constrain(kind, a, b) {
  let { x: x2, y: y2 } = b;
  const dx = x2 - a.x, dy = y2 - a.y;
  if (kind === 'line') {
    const step = Math.PI / 4;
    const ang = Math.round(Math.atan2(dy, dx) / step) * step;
    const len = Math.hypot(dx, dy);
    return { x: a.x + Math.round(Math.cos(ang) * len), y: a.y + Math.round(Math.sin(ang) * len) };
  }
  const s = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + Math.sign(dx || 1) * s, y: a.y + Math.sign(dy || 1) * s };
}

export function drawShape(c, kind, a, b, { stroke, fill, size, mode, shift }) {
  if (shift) b = constrain(kind, a, b);
  c.lineWidth = size;
  c.lineCap = 'round';
  c.lineJoin = 'miter';

  if (kind === 'line') {
    c.strokeStyle = stroke;
    c.beginPath();
    c.moveTo(a.x + 0.5, a.y + 0.5);
    c.lineTo(b.x + 0.5, b.y + 0.5);
    c.stroke();
    return;
  }

  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
  c.beginPath();
  if (kind === 'rect') c.rect(x + 0.5, y + 0.5, w, h);
  else c.ellipse(x + w / 2 + 0.5, y + h / 2 + 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);

  if (mode === 'fill') { c.fillStyle = stroke; c.fill(); }
  if (mode === 'both') { c.fillStyle = fill; c.fill(); }
  if (mode !== 'fill') { c.strokeStyle = stroke; c.stroke(); }
}

const optionsFor = (app, s) => ({
  stroke: colorFor(app, s.button),
  fill: otherColor(app, s.button),
  size: app.store.get('size'),
  mode: app.store.get('shapeMode'),
  shift: s.shift,
});

function makeShapeTool({ id, name, icon, key }) {
  return {
    id, name, icon, key, cursor: 'crosshair',
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

export const line = makeShapeTool({ id: 'line', name: '直線', icon: '╱', key: 'l' });
export const rect = makeShapeTool({ id: 'rect', name: '矩形', icon: '▭', key: 'r' });
export const ellipse = makeShapeTool({ id: 'ellipse', name: '橢圓', icon: '◯', key: 'o' });
