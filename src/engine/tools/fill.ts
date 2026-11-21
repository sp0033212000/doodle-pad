import type { Tool } from '../types';
import { colorFor } from './helpers';
import { floodFill } from '../utils/floodFill';

const fill: Tool = {
  id: 'fill',
  name: '油漆桶',
  icon: '🪣',
  key: 'f',
  cursor: 'copy',
  oneShot: true,
  onDown(app, p, s) {
    floodFill(app.canvas.ctx, p.x, p.y, colorFor(app, s.button));
  },
};

export default fill;
