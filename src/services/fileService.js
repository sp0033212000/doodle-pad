import { loadImage } from '../utils/image.js';

export function newCanvas(app) {
  app.finishPending();
  if (!confirm('確定要清空畫布嗎？（可用復原找回）')) return;
  app.history.push();
  app.canvas.clear();
  app.objects.clear();
}

/** 輸出 PNG：畫布 + 尚未鎖定的物件 */
export function saveCanvas(app) {
  app.finishPending();
  const out = document.createElement('canvas');
  out.width = app.canvas.width;
  out.height = app.canvas.height;
  const ctx = out.getContext('2d');
  ctx.drawImage(app.canvas.canvas, 0, 0);
  app.objects.drawInto(ctx);

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.download = `doodle-pad-${stamp}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
}

/** 開啟圖片：以圖片取代整張畫布（大小跟著圖片） */
export async function openImage(app, file) {
  if (!file?.type.startsWith('image/')) return;
  try {
    const img = await loadImage(file);
    app.finishPending();
    app.history.push();
    app.objects.clear();
    app.canvas.setSize(img.width, img.height, false);
    app.canvas.ctx.drawImage(img, 0, 0);
  } catch (err) {
    alert(err.message);
  }
}

/** 把圖片檔拖進畫布區即可開啟 */
export function bindDropToOpen(app, target) {
  target.addEventListener('dragover', e => e.preventDefault());
  target.addEventListener('drop', e => {
    e.preventDefault();
    openImage(app, e.dataTransfer.files[0]);
  });
}
