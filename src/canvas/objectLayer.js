import { h } from '../utils/dom.js';
import { keyOf, isMod, shouldIgnore } from '../utils/keys.js';

let nextId = 1;
const MIN_SIZE = 5;

/**
 * 物件圖層：貼上的圖片會成為浮在畫布上的「物件」，
 * 失去焦點後仍可再次點選、移動、縮放，直到使用者按「鎖定」才畫進畫布。
 *
 * 物件資料：{ id, source, x, y, w, h }（source 為不可變的圖片來源）
 */
export function createObjectLayer(app) {
  const holder = app.canvas.holder;
  const objects = [];          // 依疊放順序（後面的在上層）
  let selectedId = null;

  const find = id => objects.find(o => o.id === id);

  function render(o) {
    Object.assign(o.el.style, {
      left: o.x + 'px', top: o.y + 'px',
      width: o.w + 'px', height: o.h + 'px',
    });
    // 物件太靠上方時，把操作列放進物件內，避免被裁掉
    o.el.classList.toggle('bar-inside', o.y < 40);
  }

  // ---------- 拖曳 ----------
  /** 通用拖曳：第一次真正移動時才記錄復原點 */
  function dragHandler(el, o, onDrag) {
    let start = null;
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
      const dx = (e.clientX - start.mx) / z, dy = (e.clientY - start.my) / z;
      if (!start.moved) {
        if (!dx && !dy) return;
        app.history.push();
        start.moved = true;
      }
      onDrag(start, dx, dy, e);
      render(o);
    });
    const end = () => { start = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function build(data) {
    const o = { ...data };

    const preview = h('canvas', { width: data.source.width, height: data.source.height });
    preview.getContext('2d').drawImage(data.source, 0, 0);

    const stop = e => e.stopPropagation();
    const bar = h('div', { class: 'obj-bar', onPointerdown: stop },
      h('button', { class: 'obj-btn lock', title: '鎖定到畫布 (Enter)', onClick: () => lock(o.id) }, '🔒 鎖定到畫布'),
      h('button', { class: 'obj-btn', title: '剪下 (Ctrl/⌘+X)', onClick: () => cut(o.id) }, '✂️'),
      h('button', { class: 'obj-btn', title: '複製 (Ctrl/⌘+C)', onClick: () => copy(o.id) }, '📄'),
      h('button', { class: 'obj-btn', title: '刪除 (Delete)', onClick: () => remove(o.id) }, '🗑'),
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
      if (e.shiftKey) o.h = Math.max(MIN_SIZE, Math.round(o.w * o.source.height / o.source.width));
    });

    render(o);
    return o;
  }

  function detach(o) {
    o.el.remove();
    objects.splice(objects.indexOf(o), 1);
    if (selectedId === o.id) selectedId = null;
  }

  // ---------- 公開操作 ----------
  function select(id) {
    selectedId = id;
    const o = id != null ? find(id) : null;
    if (o) {             // 選取的物件移到最上層
      objects.splice(objects.indexOf(o), 1);
      objects.push(o);
      holder.append(o.el);
    }
    objects.forEach(x => x.el.classList.toggle('selected', x.id === selectedId));
    app.store.set('hasSelection', selectedId != null);
  }

  /** 新增物件（呼叫端負責先 history.push） */
  function add(source, { x = 0, y = 0, w = source.width, h = source.height } = {}) {
    const o = build({ id: nextId++, source, x, y, w, h });
    objects.push(o);
    holder.append(o.el);
    select(o.id);
    return o.id;
  }

  /** 把物件畫進畫布並移除（可復原） */
  function lock(id) {
    const o = find(id);
    if (!o) return;
    app.history.push();
    app.canvas.ctx.drawImage(o.source, o.x, o.y, o.w, o.h);
    detach(o);
  }

  function remove(id) {
    const o = find(id);
    if (!o) return;
    app.history.push();
    detach(o);
  }

  const dataOf = ({ source, x, y, w, h }) => ({ source, x, y, w, h });

  function getPos(id) {
    const o = find(id);
    return o ? { x: o.x, y: o.y } : null;
  }

  /** 取得物件的位置與大小 */
  function getRect(id) {
    const o = find(id);
    return o ? { x: o.x, y: o.y, w: o.w, h: o.h } : null;
  }

  /** 直接設定位置 / 大小（不記錄復原點，由呼叫端負責） */
  function setRect(id, rect) {
    const o = find(id);
    if (!o) return;
    for (const k of ['x', 'y', 'w', 'h']) {
      if (rect[k] != null) o[k] = Math.max(k === 'w' || k === 'h' ? MIN_SIZE : -Infinity, Math.round(rect[k]));
    }
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
  function moveTo(id, x, y) {
    const o = find(id);
    if (!o) return;
    o.x = Math.round(x);
    o.y = Math.round(y);
    render(o);
  }

  function copy(id) {
    const o = find(id);
    if (o) app.clipboard.copyObject(dataOf(o));
  }

  function cut(id) {
    const o = find(id);
    if (!o) return;
    app.clipboard.copyObject(dataOf(o), { cut: true });
    remove(id);
  }

  const serialize = () => objects.map(({ id, source, x, y, w, h }) => ({ id, source, x, y, w, h }));

  /** 從快照還原（復原 / 重做用） */
  function load(list) {
    const keep = selectedId;
    [...objects].forEach(detach);
    list.forEach(d => {
      const o = build(d);
      objects.push(o);
      holder.append(o.el);
    });
    select(list.some(d => d.id === keep) ? keep : null);
  }

  /** 匯出時把未鎖定的物件一起畫上 */
  const drawInto = ctx => objects.forEach(o => ctx.drawImage(o.source, o.x, o.y, o.w, o.h));

  // ---------- 鍵盤 ----------
  let nudgeTimer = null;
  window.addEventListener('keydown', e => {
    const o = find(selectedId);
    if (!o || shouldIgnore(e)) return;

    const step = e.shiftKey ? 10 : 1;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const mod = isMod(e);
    const k = keyOf(e);

    if (mod && k === 'c') copy(o.id);
    else if (mod && k === 'x') cut(o.id);
    else if (mod) return;   // 其他組合鍵（復原、貼上…）交給一般處理
    else if (e.key === 'Enter') lock(o.id);
    else if (e.key === 'Delete' || e.key === 'Backspace') remove(o.id);
    else if (e.key === 'Escape') select(null);
    else if (moves[e.key]) {
      // 連續微調只記錄一次復原點
      if (!nudgeTimer) app.history.push();
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(() => { nudgeTimer = null; }, 600);
      o.x += moves[e.key][0];
      o.y += moves[e.key][1];
      render(o);
    } else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // 點畫布 / 換工具 / 其他動作 → 取消選取（物件保留）
  app.addPending(() => { if (selectedId != null) select(null); });

  return {
    add, select, lock, remove, copy, cut, getPos, moveTo, getRect, setRect, transformAll,
    serialize, load, drawInto,
    clear: () => load([]),
    get selectedId() { return selectedId; },
    get count() { return objects.length; },
  };
}
