import type { App } from '../types';
import { loadImage } from '../utils/image';
import { createCanvas2D } from '../utils/dom';

export function newCanvas(app: App) {
  app.finishPending();
  if (!window.confirm('確定要清空畫布嗎？（可用復原找回）')) return;
  app.history.push();
  app.canvas.clear();
  app.objects.clear();
}

/** 合成畫布 + 尚未鎖定的物件 */
export function renderComposite(app: App): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas2D(app.canvas.width, app.canvas.height);
  ctx.drawImage(app.canvas.canvas, 0, 0);
  app.objects.drawInto(ctx);
  return canvas;
}

/** 輸出 PNG：畫布 + 尚未鎖定的物件 */
export function saveCanvas(app: App) {
  app.finishPending();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.download = `doodle-pad-${stamp}.png`;
  a.href = renderComposite(app).toDataURL('image/png');
  a.click();
}

/** 開啟圖片：以圖片取代整張畫布（大小跟著圖片） */
export async function openImage(app: App, file: File | null | undefined) {
  if (!file?.type.startsWith('image/')) return;
  try {
    const img = await loadImage(file);
    app.finishPending();
    app.history.push();
    app.objects.clear();
    app.canvas.setSize(img.width, img.height, false);
    app.canvas.ctx.drawImage(img, 0, 0);
  } catch (err) {
    window.alert((err as Error).message);
  }
}

/** 把圖片檔拖進畫布區即可開啟 */
export function bindDropToOpen(app: App, target: HTMLElement) {
  target.addEventListener('dragover', e => e.preventDefault());
  target.addEventListener('drop', e => {
    e.preventDefault();
    openImage(app, e.dataTransfer?.files[0]);
  });
}
