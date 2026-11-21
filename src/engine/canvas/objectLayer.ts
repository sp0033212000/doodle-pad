import type { App, Rect, SizedImageSource } from '../types';
import type { ObjectState, ObjectsPort } from '../core/history';
import { h } from '../utils/dom';
import { keyOf, isMod, shouldIgnore } from '../utils/keys';

const MIN_SIZE = 5;

interface LiveObject extends ObjectState {
  el: HTMLDivElement;
}

/** 剪貼簿使用的物件資料 */
export interface ObjectData extends Rect {
  source: SizedImageSource;
}

type DragStart = Rect & { mx: number; my: number; moved: boolean };

/**
 * 物件圖層：貼上的圖片會成為浮在畫布上的「物件」，
 * 失去焦點後仍可再次點選、移動、縮放，直到使用者按「鎖定」才畫進畫布。
 *
 * 物件只記錄 { id, assetId, x, y, w, h }；圖片本身存在圖片庫（app.assets）。
 */
export function createObjectLayer(app: App) {
  const holder = app.canvas.holder;
  const objects: LiveObject[] = []; // 依疊放順序（後面的在上層）
  let selectedId: number | null = null;
  let nextId = 1;

  const find = (id: number | null) => (id == null ? undefined : objects.find(o => o.id === id));
  const sourceOf = (o: ObjectState) => app.assets.get(o.assetId).canvas;

  function render(o: LiveObject) {
    Object.assign(o.el.style, {
      left: o.x + 'px',
      top: o.y + 'px',
      width: o.w + 'px',
      height: o.h + 'px',
    });
    // 物件太靠上方時，把操作列放進物件內，避免被裁掉
    o.el.classList.toggle('bar-inside', o.y < 40);
  }

  // ---------- 拖曳 ----------
  /** 通用拖曳：第一次真正移動時才記錄復原點 */
  function dragHandler(
    el: HTMLElement,
    o: LiveObject,
    onDrag: (s: DragStart, dx: number, dy: number, e: PointerEvent) => void,
  ) {
    let start: DragStart | null = null;
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      app.finishPending();
      select(o.id);
      start = { mx: e.clientX, my: e.clientY, x: o.x, y: o.y, w: o.w, h: o.h, moved: false };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!start) return;
      // 螢幕位移 ÷ 縮放倍率 = 畫布位移
      const z = app.store.get('zoom');
      const dx = (e.clientX - start.mx) / z;
      const dy = (e.clientY - start.my) / z;
      if (!start.moved) {
        if (!dx && !dy) return;
        app.history.beginGroup();
        app.history.push();
        start.moved = true;
      }
      onDrag(start, dx, dy, e);
      render(o);
    });
    const end = () => {
      if (start?.moved) app.history.endGroup();
      start = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function build(state: ObjectState): LiveObject {
    const source = sourceOf(state);
    const preview = h('canvas', { width: source.width, height: source.height });
    preview.getContext('2d')!.drawImage(source, 0, 0);

    const o = { ...state } as LiveObject;
    const btn = (action: string, label: string, title: string, fn: () => void, extra = '') =>
      h('button', { class: `obj-btn ${extra}`.trim(), dataset: { action }, title, onClick: fn }, label);
    const bar = h(
      'div',
      { class: 'obj-bar', onPointerdown: (e: Event) => e.stopPropagation() },
      btn('obj-lock', '🔒 鎖定到畫布', '鎖定到畫布 (Enter)', () => lock(o.id), 'lock'),
      btn('obj-cut', '✂️', '剪下 (Ctrl/⌘+X)', () => cut(o.id)),
      btn('obj-copy', '📄', '複製 (Ctrl/⌘+C)', () => copy(o.id)),
      btn('obj-delete', '🗑', '刪除 (Delete)', () => remove(o.id)),
    );
    const resizer = h('div', { class: 'obj-resize', title: '拖曳縮放（Shift 保持比例）' });
    o.el = h('div', { class: 'paste-obj', title: '拖曳移動' }, preview, bar, resizer);

    dragHandler(o.el, o, (s, dx, dy) => {
      o.x = Math.round(s.x + dx);
      o.y = Math.round(s.y + dy);
    });
    dragHandler(resizer, o, (s, dx, dy, e) => {
      o.w = Math.max(MIN_SIZE, Math.round(s.w + dx));
      o.h = Math.max(MIN_SIZE, Math.round(s.h + dy));
      if (e.shiftKey) o.h = Math.max(MIN_SIZE, Math.round((o.w * source.height) / source.width));
    });

    render(o);
    return o;
  }

  function detach(o: LiveObject) {
    o.el.remove();
    objects.splice(objects.indexOf(o), 1);
    if (selectedId === o.id) selectedId = null;
  }

  // ---------- 公開操作 ----------
  function select(id: number | null) {
    selectedId = id;
    const o = find(id);
    if (o) {
      // 選取的物件移到最上層
      objects.splice(objects.indexOf(o), 1);
      objects.push(o);
      holder.append(o.el);
    }
    objects.forEach(x => x.el.classList.toggle('selected', x.id === selectedId));
    app.store.set('hasSelection', selectedId != null);
  }

  /** 新增物件（呼叫端負責先 history.push），回傳物件 id */
  function add(source: SizedImageSource, rect: Partial<Rect> = {}): number {
    const assetId = app.assets.add(source);
    const { x = 0, y = 0, w = source.width, h: hh = source.height } = rect;
    const o = build({ id: nextId++, assetId, x, y, w, h: hh });
    objects.push(o);
    holder.append(o.el);
    select(o.id);
    return o.id;
  }

  /** 把物件畫進畫布並移除（可復原） */
  function lock(id: number) {
    const o = find(id);
    if (!o) return;
    app.history.push();
    app.canvas.ctx.drawImage(sourceOf(o), o.x, o.y, o.w, o.h);
    detach(o);
  }

  function remove(id: number) {
    const o = find(id);
    if (!o) return;
    app.history.push();
    detach(o);
  }

  const dataOf = (o: LiveObject): ObjectData => ({ source: sourceOf(o), x: o.x, y: o.y, w: o.w, h: o.h });

  function getPos(id: number) {
    const o = find(id);
    return o ? { x: o.x, y: o.y } : null;
  }

  function getRect(id: number): Rect | null {
    const o = find(id);
    return o ? { x: o.x, y: o.y, w: o.w, h: o.h } : null;
  }

  /** 直接設定位置 / 大小（不記錄復原點，由呼叫端負責） */
  function setRect(id: number, rect: Partial<Rect>) {
    const o = find(id);
    if (!o) return;
    if (rect.x != null) o.x = Math.round(rect.x);
    if (rect.y != null) o.y = Math.round(rect.y);
    if (rect.w != null) o.w = Math.max(MIN_SIZE, Math.round(rect.w));
    if (rect.h != null) o.h = Math.max(MIN_SIZE, Math.round(rect.h));
    render(o);
  }

  /** 整張圖片裁切 / 縮放時，讓所有物件跟著位移或縮放 */
  function transformAll({ dx = 0, dy = 0, sx = 1, sy = 1 }) {
    objects.forEach(o => {
      o.x = Math.round((o.x + dx) * sx);
      o.y = Math.round((o.y + dy) * sy);
      o.w = Math.max(MIN_SIZE, Math.round(o.w * sx));
      o.h = Math.max(MIN_SIZE, Math.round(o.h * sy));
      render(o);
    });
  }

  /** 由外部（選取工具拖曳）移動物件 */
  function moveTo(id: number, x: number, y: number) {
    setRect(id, { x, y });
  }

  function copy(id: number) {
    const o = find(id);
    if (o) app.clipboard.copyObject(dataOf(o));
  }

  function cut(id: number) {
    const o = find(id);
    if (!o) return;
    app.clipboard.copyObject(dataOf(o), { cut: true });
    remove(id);
  }

  const serialize = (): ObjectState[] =>
    objects.map(({ id, assetId, x, y, w, h: hh }) => ({ id, assetId, x, y, w, h: hh }));

  /** 從狀態清單還原（復原 / 重做 / 自動保存） */
  function load(list: ObjectState[]) {
    const keep = selectedId;
    [...objects].forEach(detach);
    list.forEach(state => {
      const o = build(state);
      objects.push(o);
      holder.append(o.el);
      nextId = Math.max(nextId, state.id + 1);
    });
    select(list.some(d => d.id === keep) ? keep : null);
  }

  /** 匯出時把未鎖定的物件一起畫上 */
  const drawInto = (ctx: CanvasRenderingContext2D) =>
    objects.forEach(o => ctx.drawImage(sourceOf(o), o.x, o.y, o.w, o.h));

  // ---------- 鍵盤 ----------
  let nudgeTimer: ReturnType<typeof setTimeout> | null = null;
  const MOVES: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  window.addEventListener(
    'keydown',
    e => {
      const o = find(selectedId);
      if (!o || shouldIgnore(e)) return;

      const mod = isMod(e);
      const k = keyOf(e);
      const move = MOVES[e.key];

      if (mod && k === 'c') copy(o.id);
      else if (mod && k === 'x') cut(o.id);
      else if (mod)
        return; // 其他組合鍵（復原、貼上…）交給一般處理
      else if (e.key === 'Enter') lock(o.id);
      else if (e.key === 'Delete' || e.key === 'Backspace') remove(o.id);
      else if (e.key === 'Escape') select(null);
      else if (move) {
        // 連續微調合併成同一步，停止 600ms 後才完成
        if (!nudgeTimer) {
          app.history.beginGroup();
          app.history.push();
        } else {
          clearTimeout(nudgeTimer);
        }
        nudgeTimer = setTimeout(() => {
          nudgeTimer = null;
          app.history.endGroup();
        }, 600);
        const step = e.shiftKey ? 10 : 1;
        o.x += move[0] * step;
        o.y += move[1] * step;
        render(o);
      } else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );

  // 點畫布 / 換工具 / 其他動作 → 取消選取（物件保留）
  app.addPending(() => {
    if (selectedId != null) select(null);
  });

  return {
    add,
    select,
    lock,
    remove,
    copy,
    cut,
    getPos,
    moveTo,
    getRect,
    setRect,
    transformAll,
    serialize,
    load,
    drawInto,
    clear: () => load([]),
    /** 所有物件引用的圖片 id */
    assetIds: () => objects.map(o => o.assetId),
    get selectedId() {
      return selectedId;
    },
    get count() {
      return objects.length;
    },
  } satisfies ObjectsPort & Record<string, unknown>;
}

export type ObjectLayer = ReturnType<typeof createObjectLayer>;
