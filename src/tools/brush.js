import { colorFor, strokeSegment } from './helpers.js';

const draw = (app, a, b, s) =>
  strokeSegment(app.canvas.ctx, a, b, colorFor(app, s.button), app.store.get('size'));

export default {
  id: 'brush', name: '筆刷', icon: '🖌️', key: 'b', cursor: 'crosshair',
  onDown(app, p, s) { draw(app, p, p, s); },
  onMove(app, p, s) { draw(app, s.last, p, s); },
};
