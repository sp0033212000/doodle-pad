import type { App, Point, ToolSession } from '../types';

/** 左鍵用主色、右鍵用次色 */
export const colorFor = (app: App, button: number) => app.store.get(button === 2 ? 'secondary' : 'primary');

/**
 * 依下筆力道計算筆觸粗細：觸控筆時 15%–100% 的粗細設定，其他指標維持原粗細。
 */
export function sizeFor(app: App, s: ToolSession): number {
  const size = app.store.get('size');
  if (s.pointerType !== 'pen') return size;
  const p = Math.max(0, Math.min(1, s.pressure ?? 0.5));
  return Math.max(1, Math.round(size * (0.15 + 0.85 * p)));
}

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
