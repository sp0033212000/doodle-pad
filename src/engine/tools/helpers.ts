import type { App, Point } from '../types';

/** 左鍵用主色、右鍵用次色 */
export const colorFor = (app: App, button: number) => app.store.get(button === 2 ? 'secondary' : 'primary');

/** 與 colorFor 相反的顏色（填滿色、橡皮擦色） */
export const otherColor = (app: App, button: number) => app.store.get(button === 2 ? 'primary' : 'secondary');

export function strokeSegment(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width: number,
  cap: CanvasLineCap = 'round',
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x + 0.5, a.y + 0.5);
  ctx.lineTo(b.x + 0.5, b.y + 0.5);
  ctx.stroke();
}
