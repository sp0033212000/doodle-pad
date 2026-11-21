import type { App, Point, Tool } from '../types';
import { colorFor } from './helpers';

function spray(app: App, p: Point, color: string) {
  const { ctx } = app.canvas;
  const r = Math.max(4, app.store.get('size') * 2);
  ctx.fillStyle = color;
  for (let i = 0; i < r * 1.5; i++) {
    const ang = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * r;
    ctx.fillRect(Math.round(p.x + Math.cos(ang) * d), Math.round(p.y + Math.sin(ang) * d), 1, 1);
  }
}

const sprayTool: Tool = {
  id: 'spray',
  name: '噴槍',
  icon: '💨',
  key: 'a',
  cursor: 'crosshair',
  onDown(app, p, s) {
    const color = colorFor(app, s.button);
    spray(app, p, color);
    s.timer = setInterval(() => spray(app, s.last, color), 30);
  },
  onUp(_app, _p, s) {
    clearInterval(s.timer);
  },
};

export default sprayTool;
