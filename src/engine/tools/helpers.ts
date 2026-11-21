import type { App, Point, ToolSession } from '../types';
import { alphaOf, opaque } from '../utils/color';

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

/**
 * 半透明筆觸：若在主畫布上逐段繪製，線段重疊處會越疊越深。
 * 改為以不透明色畫在預覽層（CSS opacity 顯示實際透明度），放開時再以 globalAlpha 一次合成。
 * 回傳本次要畫的 context 與顏色；完全不透明時直接畫在主畫布。
 */
export function strokeTarget(app: App, color: string): { ctx: CanvasRenderingContext2D; color: string } {
  const a = alphaOf(color);
  if (a >= 1) return { ctx: app.canvas.ctx, color };
  app.canvas.overlay.style.opacity = String(a);
  return { ctx: app.canvas.octx, color: opaque(color) };
}

/** 把預覽層上的半透明筆觸合成到主畫布（沒有半透明筆觸時不做事） */
export function finishAlphaStroke(app: App) {
  const { overlay, ctx } = app.canvas;
  const a = Number(overlay.style.opacity);
  if (!overlay.style.opacity || !(a < 1)) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(overlay, 0, 0);
  ctx.restore();
  app.canvas.clearOverlay();
}

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
