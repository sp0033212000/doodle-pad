import type { App, Point, Tool, ToolSession } from '../types';
import { colorFor, finishAlphaStroke, sizeFor, strokeSegment, strokeTarget } from './helpers';

function draw(app: App, a: Point, b: Point, s: ToolSession) {
  const t = strokeTarget(app, colorFor(app, s.button));
  strokeSegment(t.ctx, a, b, t.color, sizeFor(app, s));
}

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
  onUp(app) {
    finishAlphaStroke(app);
  },
};

export default brush;
