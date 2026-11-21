import type { App, Point } from '../types';
import type { ObjectData } from './objectLayer';
import { h, createCanvas2D } from '../utils/dom';
import { hexToRgba } from '../utils/color';
import { floodRegion } from '../utils/floodFill';
import { keyOf, isMod, shouldIgnore } from '../utils/keys';
import { labelProps } from '../i18n';
import { type Region, rectRegion, regionFromFullMask, regionContains, regionOutline } from './selectionMask';

/**
 * 選取範圍（矩形選取 / 套索 / 魔術棒共用）。
 * 動作：
 *  - 剪下 Ctrl/⌘+X、複製 Ctrl/⌘+C → 之後 Ctrl/⌘+V 會貼成可編輯物件
 *  - 刪除 Delete → 以次色填滿
 *  - 拖曳選取範圍內部 / 「轉為物件」→ 挖出來成為可移動的物件
 *  - 裁切 Ctrl/⌘+Shift+X、全選 Ctrl/⌘+A、Esc 取消
 * 挖空處以「次色」填滿（與傳統小畫家相同）。
 */
export function createSelection(app: App) {
  const { holder } = app.canvas;
  const { store } = app;

  // ---------- DOM：螞蟻線圖層 + 操作列 ----------
  const layer = h('canvas', { class: 'selection-layer' });
  const lctx = layer.getContext('2d')!;
  const btn = (action: string, key: string, icon: string, fn: () => void, withText = true) => {
    const l = labelProps({
      icon,
      text: withText ? `engine.sel.${key}` : undefined,
      title: `engine.sel.${key}Title`,
    });
    return h(
      'button',
      { class: 'obj-btn', title: l.title, dataset: { action, ...l.dataset }, onClick: fn },
      l.text,
    );
  };
  const bar = h(
    'div',
    {
      class: 'obj-bar',
      onPointerdown: (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    btn('sel-cut', 'cut', '✂️', () => cut()),
    btn('sel-copy', 'copy', '📄', () => copy()),
    btn('sel-lift', 'lift', '⤢', () => lift()),
    btn('sel-crop', 'crop', '⌗', () => app.image.crop()),
    btn('sel-delete', 'delete', '🗑', () => erase(), false),
  );
  const box = h('div', { class: 'sel-box' }, bar);
  holder.append(layer, box);

  let sel: (Region & { outline: Path2D }) | null = null;
  let dash = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  // ---------- 繪製螞蟻線 ----------
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
    if (layer.width !== w || layer.height !== hh) {
      layer.width = w;
      layer.height = hh;
    }
  }

  // ---------- 狀態 ----------
  function set(next: Region | null) {
    if (timer) clearInterval(timer);
    timer = null;
    if (next) {
      const outline = new Path2D();
      for (const [x1, y1, x2, y2] of regionOutline(next)) {
        outline.moveTo(x1, y1);
        outline.lineTo(x2, y2);
      }
      sel = { ...next, outline };
      Object.assign(box.style, {
        display: 'block',
        left: next.x + 'px',
        top: next.y + 'px',
        width: next.w + 'px',
        height: next.h + 'px',
      });
      box.classList.toggle('bar-inside', next.y < 40);
      timer = setInterval(() => {
        dash = (dash + 1) % 8;
        draw();
      }, 100);
    } else {
      sel = null;
      box.style.display = 'none';
    }
    store.set('hasRegion', !!sel);
    draw();
  }
  const clear = () => {
    if (sel) set(null);
  };

  store.on('canvasSize', () => {
    clear();
    syncLayerSize();
  });
  store.on('zoom', draw);

  // ---------- 建立選取 ----------
  const bounds = () => ({ w: app.canvas.width, h: app.canvas.height });

  const setRect = (a: Point, b: Point) => set(rectRegion(a, b, bounds()));

  function setPolygon(points: Point[]) {
    if (points.length < 3) return set(null);
    const { w: W, h: H } = bounds();
    const xs = points.map(p => p.x),
      ys = points.map(p => p.y);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))),
      x1 = Math.min(W, Math.ceil(Math.max(...xs)) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...ys))),
      y1 = Math.min(H, Math.ceil(Math.max(...ys)) + 1);
    const w = x1 - x0,
      hh = y1 - y0;
    if (w < 1 || hh < 1) return set(null);

    const { ctx } = createCanvas2D(w, hh);
    ctx.translate(-x0, -y0);
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x + 0.5, p.y + 0.5) : ctx.moveTo(p.x + 0.5, p.y + 0.5)));
    ctx.closePath();
    ctx.fill();

    const d = ctx.getImageData(0, 0, w, hh).data;
    const mask = new Uint8Array(w * hh);
    let any = false;
    for (let k = 0; k < mask.length; k++) {
      if (d[k * 4 + 3] >= 128) {
        mask[k] = 1;
        any = true;
      }
    }
    set(any ? { x: x0, y: y0, w, h: hh, mask } : null);
  }

  function setWand(p: Point) {
    const { w, h: hh } = bounds();
    const full = floodRegion(app.canvas.getPixels(0, 0, w, hh), p.x, p.y);
    set(full ? regionFromFullMask(full, w) : null);
  }

  const selectAll = () => setRect({ x: 0, y: 0 }, { x: app.canvas.width, y: app.canvas.height });

  // ---------- 動作 ----------
  const contains = (p: Point) => regionContains(sel, p);

  /** 取出選取的像素（範圍外透明） */
  function extract(r: Region): ObjectData {
    const { x, y, w, h: hh, mask } = r;
    const img = app.canvas.ctx.getImageData(x, y, w, hh);
    for (let k = 0; k < mask.length; k++) if (!mask[k]) img.data[k * 4 + 3] = 0;
    const { canvas, ctx } = createCanvas2D(w, hh);
    ctx.putImageData(img, 0, 0);
    return { source: canvas, x, y, w, h: hh };
  }

  /** 以次色填滿選取範圍 */
  function fillHole(r: Region) {
    const { x, y, w, h: hh, mask } = r;
    const img = app.canvas.ctx.getImageData(x, y, w, hh);
    const [cr, cg, cb] = hexToRgba(store.get('secondary'));
    for (let k = 0; k < mask.length; k++) {
      if (!mask[k]) continue;
      const i = k * 4;
      img.data[i] = cr;
      img.data[i + 1] = cg;
      img.data[i + 2] = cb;
      img.data[i + 3] = 255;
    }
    app.canvas.ctx.putImageData(img, x, y);
  }

  function copy() {
    if (sel) app.clipboard.copyObject(extract(sel));
  }

  function cut() {
    if (!sel) return;
    app.clipboard.copyObject(extract(sel), { cut: true });
    app.history.push();
    fillHole(sel);
    set(null);
  }

  function erase() {
    if (!sel) return;
    app.history.push();
    fillHole(sel);
    set(null);
  }

  /** 挖出成為可移動的物件，回傳物件 id */
  function lift(): number | null {
    if (!sel) return null;
    const data = extract(sel);
    app.history.push();
    fillHole(sel);
    set(null);
    return app.objects.add(data.source, data);
  }

  // ---------- 鍵盤 ----------
  window.addEventListener(
    'keydown',
    e => {
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
    },
    true,
  );

  syncLayerSize();

  return {
    setRect,
    setPolygon,
    setWand,
    selectAll,
    clear,
    contains,
    copy,
    cut,
    erase,
    lift,
    get active() {
      return sel !== null;
    },
    /** 目前的選取資料或 null */
    get region(): Region | null {
      return sel && { x: sel.x, y: sel.y, w: sel.w, h: sel.h, mask: sel.mask };
    },
  };
}

export type Selection = ReturnType<typeof createSelection>;
