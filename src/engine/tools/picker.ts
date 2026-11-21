import type { Tool } from '../types';
import { rgbToHex } from '../utils/color';

const picker: Tool = {
  id: 'picker',
  name: '滴管',
  icon: '💧',
  key: 'i',
  cursor: 'copy',
  oneShot: true,
  modifiesCanvas: false,
  onDown(app, p, s) {
    const [r, g, b] = app.canvas.ctx.getImageData(p.x, p.y, 1, 1).data;
    app.store.set(s.button === 2 ? 'secondary' : 'primary', rgbToHex(r, g, b));
  },
};

export default picker;
