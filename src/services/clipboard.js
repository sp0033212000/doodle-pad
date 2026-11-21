import { loadImage } from '../utils/image.js';

const CASCADE = 10; // 重複貼上同一物件時的位移

/**
 * 剪貼簿：
 *  - 貼上：Ctrl/⌘+V 或工具列「貼上」按鈕。圖片會成為可編輯物件（見 canvas/objectLayer.js）
 *  - 剪下 / 複製物件：存進內部剪貼簿（保留縮放後大小與位置），同時寫入系統剪貼簿
 *  - 畫布長或寬不足以容納貼上的圖片時，立即擴大該方向
 */
export function createClipboard(app) {
  // 內部剪貼簿：{ source, w, h, x, y, cut }
  let internal = null;
  // 離開視窗後，使用者可能在別處複製了新東西 → 改用系統剪貼簿
  let fresh = false;
  window.addEventListener('blur', () => { fresh = false; });

  /** 記錄復原點、必要時擴大畫布，再新增物件 */
  function insert(source, { x, y, w = source.width, h = source.height }) {
    app.finishPending();
    app.history.push();
    const c = app.canvas;
    const cw = Math.max(c.width, w);
    const ch = Math.max(c.height, h);
    if (cw !== c.width || ch !== c.height) c.setSize(cw, ch, true);
    app.objects.add(source, { x, y, w, h });
  }

  function visibleTopLeft() {
    const { scrollLeft, scrollTop } = app.stage;
    const z = app.store.get('zoom');
    // 捲動過時留 44px（螢幕）給物件上方的操作列；未捲動時放 0，操作列會自動移進物件內
    const vx = scrollLeft > 16 ? scrollLeft - 16 + 8 : 0;
    const vy = scrollTop > 16 ? scrollTop - 16 + 44 : 0;
    return { x: Math.round(vx / z), y: Math.round(vy / z) };
  }

  async function pasteBlob(blob) {
    try {
      insert(await loadImage(blob), visibleTopLeft());
    } catch (err) {
      alert(err.message);
    }
  }

  function pasteInternal() {
    const d = internal;
    if (d.cut) d.cut = false;            // 剪下後第一次貼回原位
    else { d.x += CASCADE; d.y += CASCADE; } // 複製則每次往右下錯開
    insert(d.source, { x: d.x, y: d.y, w: d.w, h: d.h });
  }

  /** 複製物件資料 { source, x, y, w, h } */
  async function copyObject(data, { cut = false } = {}) {
    internal = { ...data, cut };
    fresh = true;
    app.store.set('canPasteInternal', true);
    // 盡力寫入系統剪貼簿，讓其他程式也能貼上；失敗則只用內部剪貼簿
    try {
      const cv = document.createElement('canvas');
      cv.width = data.w;
      cv.height = data.h;
      cv.getContext('2d').drawImage(data.source, 0, 0, data.w, data.h);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch { /* 不支援或未授權 */ }
  }

  /** 工具列「貼上」按鈕 */
  async function paste() {
    if (internal && fresh) { pasteInternal(); return; }
    if (!navigator.clipboard?.read) {
      if (internal) { pasteInternal(); return; }
      alert('此瀏覽器不支援從按鈕讀取剪貼簿，請改用 Ctrl/⌘+V 貼上。');
      return;
    }
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) { await pasteBlob(await item.getType(type)); return; }
      }
      if (internal) pasteInternal();
      else alert('剪貼簿裡沒有圖片。');
    } catch (err) {
      if (internal) pasteInternal();
      else alert(`無法讀取剪貼簿（${err.message}）。\n請改用 Ctrl/⌘+V 貼上。`);
    }
  }

  // Ctrl/⌘+V
  window.addEventListener('paste', e => {
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return; // 讓文字框正常貼上文字
    if (internal && fresh) { e.preventDefault(); pasteInternal(); return; }
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); pasteBlob(item.getAsFile()); return; }
    if (internal) { e.preventDefault(); pasteInternal(); }
  });

  return { paste, pasteBlob, copyObject };
}
