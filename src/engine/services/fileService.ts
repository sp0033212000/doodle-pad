import type { App } from '../types';
import { loadImage } from '../utils/image';
import { createCanvas2D } from '../utils/dom';
import { tr } from '../i18n';
import { captureDocument, applyDocument } from '../persistence/document';
import {
  encodeProject,
  decodeProject,
  PROJECT_EXTENSION,
  ProjectFileError,
} from '../persistence/projectFile';

export function newCanvas(app: App) {
  app.finishPending();
  if (!window.confirm(tr('engine.msg.confirmNew'))) return;
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
  download(`doodle-pad-${timestamp()}.png`, renderComposite(app).toDataURL('image/png'));
}

const timestamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

function download(filename: string, href: string) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = href;
  a.click();
}

/** 匯出 .doodle 專案檔 */
export function exportProject(app: App, { includeHistory = false } = {}) {
  app.finishPending();
  const doc = captureDocument(app, { includeHistory });
  const json = JSON.stringify(encodeProject(doc, { includeHistory }));
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  download(`doodle-pad-${timestamp()}${PROJECT_EXTENSION}`, url);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 匯入 .doodle 專案檔（取代目前的作品） */
export async function importProject(app: App, file: File) {
  if (!window.confirm(tr('engine.msg.confirmImport'))) return;
  try {
    const doc = await decodeProject(JSON.parse(await file.text()));
    applyDocument(app, doc);
  } catch (err) {
    const detail = err instanceof ProjectFileError || err instanceof SyntaxError ? err.message : String(err);
    window.alert(tr('engine.msg.invalidProject', { error: detail }));
  }
}

export const isProjectFile = (file: File) => file.name.toLowerCase().endsWith(PROJECT_EXTENSION);

/** 開啟檔案：.doodle 專案檔或圖片 */
export function openFile(app: App, file: File | null | undefined) {
  if (!file) return;
  return isProjectFile(file) ? importProject(app, file) : openImage(app, file);
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

/** 把圖片或專案檔拖進畫布區即可開啟 */
export function bindDropToOpen(app: App, target: HTMLElement) {
  target.addEventListener('dragover', e => e.preventDefault());
  target.addEventListener('drop', e => {
    e.preventDefault();
    openFile(app, e.dataTransfer?.files[0]);
  });
}
