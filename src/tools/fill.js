import { colorFor } from './helpers.js';
import { floodFill } from '../utils/floodFill.js';

export default {
  id: 'fill', name: '油漆桶', icon: '🪣', key: 'f', cursor: 'copy',
  oneShot: true,
  onDown(app, p, s) { floodFill(app.canvas.ctx, p.x, p.y, colorFor(app, s.button)); },
};
