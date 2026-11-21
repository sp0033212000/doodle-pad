import type { App, Point, Tool, ToolSession } from '../types';
import { colorFor, sizeFor, strokeSegment } from './helpers';

const draw = (app: App, a: Point, b: Point, s: ToolSession) =>
  strokeSegment(app.canvas.ctx, a, b, colorFor(app, s.button), sizeFor(app, s));

const brush: Tool = {
  id: 'brush',
  name: '筆刷',
  icon: '🖌️',
  key: 'b',
  cursor: 'crosshair',
  onDown(app, p, s) {
    draw(app, p, p, s);
  },
  onMove(app, p, s) {
    draw(app, s.last, p, s);
  },
};

export default brush;
