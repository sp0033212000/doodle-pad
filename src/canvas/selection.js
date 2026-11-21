import { h, clamp } from '../utils/dom.js';
import { hexToRgba } from '../utils/color.js';
import { floodRegion } from '../utils/floodFill.js';
import { keyOf, isMod, shouldIgnore } from '../utils/keys.js';

/**
 * 選取範圍（矩形選取 / 套索 / 魔術棒共用）。
 *
 * 選取資料：{ x, y, w, h, mask }，mask 為外框矩形內的 Uint8Array（1 = 選取）。
 * 動作：
 *  - 剪下 Ctrl/⌘+X、複製 Ctrl/⌘+C → 之後 Ctrl/⌘+V 會貼成可編輯物件
 *  - 刪除 Delete → 以次色填滿
 *  - 拖曳選取範圍內部 / 「轉為物件」→ 挖出來成為可移動的物件
 *  - Ctrl/⌘+A 全選、Esc 取消
 * 挖空處以「次色」填滿（與傳統小畫家相同）。
 */
export function createSelection(app) {
  const { holder } = app.canvas;
  const { store } = app;

  // ---------- DOM：螞蟻線圖層 + 操作列 ----------
  const layer = h('canvas', { class: 'selection-layer' });
  const lctx = layer.getContext('2d');
  const btn = (label, title, fn) => h('button', { class: 'obj-btn', title, onClick: fn }, label);
  const bar = h('div', {
    class: 'obj-bar',
    onPointerdown: e => { e.preventDefault(); e.stopPropagation(); },
  },
    btn('✂️ 剪下', '剪下 (Ctrl/⌘+X)', () => cut()),
    btn('📄 複製', '複製 (Ctrl/⌘+C)', () => copy()),
    btn('⤢ 轉為物件', '挖出成為可移動的物件（也可直接拖曳選取範圍）', () => lift()),
    btn('⌗ 裁切', '把畫布裁切成選取範圍 (Ctrl/⌘+Shift+X)', () => app.image.crop()),
    btn('🗑', '刪除選取內容 (Delete)', () => erase()),
  );
  const box = h('div', { class: 'sel-box' }, bar);
  holder.append(layer, box);

  let sel = null;
  let dash = 0;
  let timer = null;

  // ---------- 繪製螞蟻線 ----------
  /** 由遮罩邊界產生外框路徑（合併同一直線上的連續邊） */
  function buildOutline({ x, y, w, h: hh, mask }) {
    const at = (i, j) => i >= 0 && j >= 0 && i < w && j < hh && mask[j * w + i] === 1;
    const path = new Path2D();
    for (let j = 0; j <= hh; j++) {          // 水平邊
      let run = -1;
      for (let i = 0; i <= w; i++) {
        const edge = i < w && at(i, j - 1) !== at(i, j);
        if (edge && run < 0) run = i;
        if (!edge && run >= 0) { path.moveTo(x + run, y + j); path.lineTo(x + i, y + j); run = -1; }
      }
    }
    for (let i = 0; i <= w; i++) {           // 垂直邊
      let run = -1;
      for (let j = 0; j <= hh; j++) {
        const edge = j < hh && at(i - 1, j) !== at(i, j);
        if (edge && run < 0) run = j;
        if (!edge && run >= 0) { path.moveTo(x + i, y + run); path.lineTo(x + i, y + j); run = -1; }
      }
    }
    return path;
  }

  function draw() {
    lctx.clearRect(0, 0, layer.width, layer.height);
    if (!sel) return;
    const z = store.get('zoom');
    lctx.lineWidth = 1 / z;
    lctx.setLineDash([]);
    lctx.strokeStyle = '#fff';
    lctx.stroke(sel.outline);
    lctx.setLineDash([4 / z, 4 / z]);
    lctx.lineDashOffset = -dash / z;
    lctx.strokeStyle = '#000';
    lctx.stroke(sel.outline);
  }

  function syncLayerSize() {
    const { w, h: hh } = store.get('canvasSize');
    if (layer.width !== w || layer.height !== hh) { layer.width = w; layer.height = hh; }
  }

  // ---------- 狀態 ----------
  function set(next) {
    sel = next;
    clearInterval(timer);
    timer = null;
    if (sel) {
      sel.outline = buildOutline(sel);
      Object.assign(box.style, {
        display: 'block',
        left: sel.x + 'px', top: sel.y + 'px',
        width: sel.w + 'px', height: sel.h + 'px',
      });
      box.classList.toggle('bar-inside', sel.y < 40);
      timer = setInterval(() => { dash = (dash + 1) % 8; draw(); }, 100);
    } else {
      box.style.display = 'none';
    }
    store.set('hasRegion', !!sel);
    draw();
  }
  const clear = () => { if (sel) set(null); };

  store.on('canvasSize', () => { clear(); syncLayerSize(); });
  store.on('zoom', draw);

  // ---------- 建立選取 ----------
  const W = () => app.canvas.width;
  const H = () => app.canvas.height;

  function setRect(a, b) {
    const x0 = clamp(Math.min(a.x, b.x), 0, W()), x1 = clamp(Math.max(a.x, b.x), 0, W());
    const y0 = clamp(Math.min(a.y, b.y), 0, H()), y1 = clamp(Math.max(a.y, b.y), 0, H());
    const w = x1 - x0, hh = y1 - y0;
    if (w < 1 || hh < 1) return set(null);
    set({ x: x0, y: y0, w, h: hh, mask: new Uint8Array(w * hh).fill(1) });
  }

  function setPolygon(points) {
    if (points.length < 3) return set(null);
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const x0 = clamp(Math.floor(Math.min(...xs)), 0, W()), x1 = clamp(Math.ceil(Math.max(...xs)) + 1, 0, W());
    const y0 = clamp(Math.floor(Math.min(...ys)), 0, H()), y1 = clamp(Math.ceil(Math.max(...ys)) + 1, 0, H());
    const w = x1 - x0, hh = y1 - y0;
    if (w < 1 || hh < 1) return set(null);

    const c = h('canvas', { width: w, height: hh });
    const cx = c.getContext('2d');
    cx.translate(-x0, -y0);
    cx.beginPath();
    points.forEach((p, i) => (i ? cx.lineTo(p.x + 0.5, p.y + 0.5) : cx.moveTo(p.x + 0.5, p.y + 0.5)));
    cx.closePath();
    cx.fill();

    const d = cx.getImageData(0, 0, w, hh).data;
    const mask = new Uint8Array(w * hh);
    let any = false;
    for (let k = 0; k < mask.length; k++) if (d[k * 4 + 3] >= 128) { mask[k] = 1; any = true; }
    set(any ? { x: x0, y: y0, w, h: hh, mask } : null);
  }

  function setWand(p) {
    const img = app.canvas.ctx.getImageData(0, 0, W(), H());
    const full = floodRegion(img, p.x, p.y);
    if (!full) return set(null);
    const fw = W();
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let k = 0; k < full.length; k++) {
      if (!full[k]) continue;
      const x = k % fw, y = (k / fw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return set(null);
    const w = x1 - x0 + 1, hh = y1 - y0 + 1;
    const mask = new Uint8Array(w * hh);
    for (let j = 0; j < hh; j++) mask.set(full.subarray((y0 + j) * fw + x0, (y0 + j) * fw + x0 + w), j * w);
    set({ x: x0, y: y0, w, h: hh, mask });
  }

  const selectAll = () => setRect({ x: 0, y: 0 }, { x: W(), y: H() });

  // ---------- 動作 ----------
  function contains(p) {
    if (!sel) return false;
    const i = p.x - sel.x, j = p.y - sel.y;
    return i >= 0 && j >= 0 && i < sel.w && j < sel.h && sel.mask[j * sel.w + i] === 1;
  }

  /** 取出選取的像素（範圍外透明） */
  function extract() {
    const { x, y, w, h: hh, mask } = sel;
    const img = app.canvas.ctx.getImageData(x, y, w, hh);
    for (let k = 0; k < mask.length; k++) if (!mask[k]) img.data[k * 4 + 3] = 0;
    const c = h('canvas', { width: w, height: hh });
    c.getContext('2d').putImageData(img, 0, 0);
    return { source: c, x, y, w, h: hh };
  }

  /** 以次色填滿選取範圍 */
  function fillHole() {
    const { x, y, w, h: hh, mask } = sel;
    const img = app.canvas.ctx.getImageData(x, y, w, hh);
    const [r, g, b] = hexToRgba(store.get('secondary'));
    for (let k = 0; k < mask.length; k++) {
      if (!mask[k]) continue;
      const i = k * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    app.canvas.ctx.putImageData(img, x, y);
  }

  function copy() {
    if (sel) app.clipboard.copyObject(extract());
  }

  function cut() {
    if (!sel) return;
    app.clipboard.copyObject(extract(), { cut: true });
    app.history.push();
    fillHole();
    set(null);
  }

  function erase() {
    if (!sel) return;
    app.history.push();
    fillHole();
    set(null);
  }

  /** 挖出成為可移動的物件，回傳物件 id */
  function lift() {
    if (!sel) return null;
    const data = extract();
    app.history.push();
    fillHole();
    set(null);
    return app.objects.add(data.source, data);
  }

  // ---------- 鍵盤 ----------
  window.addEventListener('keydown', e => {
    if (shouldIgnore(e)) return;
    const mod = isMod(e);
    const k = keyOf(e);

    if (mod && k === 'a') {
      e.preventDefault();
      e.stopImmediatePropagation();
      app.finishPending();
      if (!app.getTool().isSelection) app.setTool('select');
      selectAll();
      return;
    }
    if (!sel || app.objects.selectedId != null) return; // 選取物件時交給物件圖層

    if (mod && e.shiftKey && k === 'x') app.image.crop();
    else if (mod && k === 'c') copy();
    else if (mod && k === 'x') cut();
    else if (mod) return;
    else if (e.key === 'Delete' || e.key === 'Backspace') erase();
    else if (e.key === 'Escape') clear();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  syncLayerSize();

  return {
    setRect, setPolygon, setWand, selectAll, clear, contains,
    copy, cut, erase, lift,
    get active() { return sel !== null; },
    /** 目前的選取資料 { x, y, w, h, mask } 或 null */
    get region() { return sel && { x: sel.x, y: sel.y, w: sel.w, h: sel.h, mask: sel.mask }; },
  };
}
