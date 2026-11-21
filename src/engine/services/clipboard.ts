import type { App, Point, Rect, SizedImageSource } from '../types';
import type { ObjectData } from '../canvas/objectLayer';
import { loadImage } from '../utils/image';
import { createCanvas2D } from '../utils/dom';
import { tr } from '../i18n';

const CASCADE = 10; // 重複貼上同一物件時的位移

/**
 * 剪貼簿：
 *  - 貼上：Ctrl/⌘+V 或工具列「貼上」按鈕。圖片會成為可編輯物件（見 canvas/objectLayer）
 *  - 剪下 / 複製物件或選取範圍：存進內部剪貼簿（保留縮放後大小與位置），同時盡力寫入系統剪貼簿
 *  - 畫布長或寬不足以容納貼上的圖片時，立即擴大該方向
 */
export function createClipboard(app: App) {
  let internal: (ObjectData & { cut: boolean }) | null = null;
  // 離開視窗後，使用者可能在別處複製了新東西 → 改用系統剪貼簿
  let fresh = false;
  window.addEventListener('blur', () => {
    fresh = false;
  });

  const notify = (msg: string) => window.alert(msg);

  /** 記錄復原點、必要時擴大畫布，再新增物件 */
  function insert(source: SizedImageSource, rect: Point & Partial<Rect>) {
    const { x, y, w = source.width, h = source.height } = rect;
    app.finishPending();
    app.history.push();
    const c = app.canvas;
    const cw = Math.max(c.width, w);
    const ch = Math.max(c.height, h);
    if (cw !== c.width || ch !== c.height) c.setSize(cw, ch, true);
    app.objects.add(source, { x, y, w, h });
  }

  function visibleTopLeft(): Point {
    const { scrollLeft, scrollTop } = app.stage;
    const z = app.store.get('zoom');
    // 捲動過時留 44px（螢幕）給物件上方的操作列；未捲動時放 0，操作列會自動移進物件內
    const vx = scrollLeft > 16 ? scrollLeft - 16 + 8 : 0;
    const vy = scrollTop > 16 ? scrollTop - 16 + 44 : 0;
    return { x: Math.round(vx / z), y: Math.round(vy / z) };
  }

  async function pasteBlob(blob: Blob) {
    try {
      insert(await loadImage(blob), visibleTopLeft());
    } catch (err) {
      notify((err as Error).message);
    }
  }

  function pasteInternal() {
    const d = internal;
    if (!d) return;
    if (d.cut)
      d.cut = false; // 剪下後第一次貼回原位
    else {
      d.x += CASCADE;
      d.y += CASCADE;
    } // 複製則每次往右下錯開
    insert(d.source, { x: d.x, y: d.y, w: d.w, h: d.h });
  }

  async function copyObject(data: ObjectData, { cut = false } = {}) {
    internal = { ...data, cut };
    fresh = true;
    app.store.set('canPasteInternal', true);
    // 盡力寫入系統剪貼簿，讓其他程式也能貼上；失敗則只用內部剪貼簿
    try {
      const { canvas, ctx } = createCanvas2D(data.w, data.h);
      ctx.drawImage(data.source, 0, 0, data.w, data.h);
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
      if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch {
      /* 不支援或未授權 */
    }
  }

  /** 工具列「貼上」按鈕 */
  async function paste() {
    if (internal && fresh) return pasteInternal();
    if (!navigator.clipboard?.read) {
      if (internal) return pasteInternal();
      notify(tr('engine.msg.clipboardUnsupported'));
      return;
    }
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) return pasteBlob(await item.getType(type));
      }
      if (internal) pasteInternal();
      else notify(tr('engine.msg.clipboardEmpty'));
    } catch (err) {
      if (internal) pasteInternal();
      else notify(tr('engine.msg.clipboardFailed', { error: (err as Error).message }));
    }
  }

  // Ctrl/⌘+V
  window.addEventListener('paste', e => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return; // 讓文字框正常貼上文字
    if (internal && fresh) {
      e.preventDefault();
      pasteInternal();
      return;
    }
    const item = [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      pasteBlob(file);
      return;
    }
    if (internal) {
      e.preventDefault();
      pasteInternal();
    }
  });

  return { paste, pasteBlob, copyObject };
}

export type Clipboard = ReturnType<typeof createClipboard>;
