import type { App, Point } from '../types';
import { clamp } from '../utils/dom';
import { PIXEL_GRID_MIN_ZOOM, ZOOM_RANGE, ZOOM_STEPS } from '../config';

/** Safari 的觸控板捏合事件（非標準） */
interface GestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

/**
 * 畫布檢視縮放（不改變畫布實際像素）。
 *  - 觸控板兩指捏合（Chrome / Edge / Firefox 送出 ctrl+wheel；Safari 送出 gesture 事件）
 *  - 觸控螢幕兩指捏合，同時可兩指拖曳平移
 *  - Ctrl/⌘ + 滾輪、Ctrl/⌘ + = / - / 0
 *
 * 做法：holder 以 CSS transform: scale() 縮放，外層 sizer 撐出縮放後的捲動範圍。
 * 縮放時以手指 / 游標位置為中心，讓該點保持不動。
 */
export function createZoom(app: App, sizer: HTMLElement) {
  const { store } = app;
  const { holder } = app.canvas;

  // 像素格線放在 sizer（未縮放）裡，線條永遠是清楚的 1 螢幕像素
  const grid = document.createElement('div');
  grid.className = 'pixel-grid';
  sizer.append(grid);

  function layout() {
    const z = store.get('zoom');
    const { w, h } = store.get('canvasSize');
    sizer.style.width = w * z + 'px';
    sizer.style.height = h * z + 'px';
    holder.style.transform = `scale(${z})`;
    holder.style.setProperty('--zoom', String(z));
    holder.classList.toggle('pixelated', z >= 2);
    grid.hidden = z < PIXEL_GRID_MIN_ZOOM;
    grid.style.backgroundSize = `${z}px ${z}px`;
  }
  store.on('zoom', layout);
  store.on('canvasSize', layout);

  /** 設定縮放；(clientX, clientY) 為不動點，省略時用可見區域中心 */
  function setZoom(target: number, clientX?: number, clientY?: number) {
    const old = store.get('zoom');
    const z = clamp(Math.round(target * 1000) / 1000, ZOOM_RANGE.min, ZOOM_RANGE.max);
    if (z === old) return;
    const st = app.stage;
    if (clientX == null || clientY == null) {
      const sr = st.getBoundingClientRect();
      clientX = sr.left + st.clientWidth / 2;
      clientY = sr.top + st.clientHeight / 2;
    }
    const r = sizer.getBoundingClientRect();
    const cx = (clientX - r.left) / old; // 不動點的畫布座標
    const cy = (clientY - r.top) / old;

    store.set('zoom', z);

    const r2 = sizer.getBoundingClientRect();
    st.scrollLeft += r2.left + cx * z - clientX;
    st.scrollTop += r2.top + cy * z - clientY;
  }

  /** 以倍率 z 放大，並把畫布座標 (cx, cy) 捲到可見區域中央 */
  function zoomTo(target: number, cx: number, cy: number) {
    setZoom(target);
    const z = store.get('zoom');
    const st = app.stage;
    const sr = st.getBoundingClientRect();
    const r = sizer.getBoundingClientRect();
    st.scrollLeft += r.left + cx * z - (sr.left + st.clientWidth / 2);
    st.scrollTop += r.top + cy * z - (sr.top + st.clientHeight / 2);
  }

  const zoomIn = () => setZoom(ZOOM_STEPS.find(s => s > store.get('zoom') + 1e-6) ?? ZOOM_RANGE.max);
  const zoomOut = () =>
    setZoom([...ZOOM_STEPS].reverse().find(s => s < store.get('zoom') - 1e-6) ?? ZOOM_RANGE.min);
  const reset = () => setZoom(1);

  function bind() {
    const st = app.stage;

    // ---------- 觸控板捏合 / Ctrl+滾輪 ----------
    st.addEventListener(
      'wheel',
      e => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const delta = clamp(e.deltaY, -30, 30);
        setZoom(store.get('zoom') * Math.exp(-delta * 0.01), e.clientX, e.clientY);
      },
      { passive: false },
    );

    // ---------- Safari 觸控板捏合 ----------
    let gestureStart = 1;
    st.addEventListener('gesturestart', e => {
      e.preventDefault();
      gestureStart = store.get('zoom');
    });
    st.addEventListener('gesturechange', e => {
      e.preventDefault();
      const g = e as GestureEvent;
      setZoom(gestureStart * g.scale, g.clientX, g.clientY);
    });
    st.addEventListener('gestureend', e => e.preventDefault());

    // ---------- 觸控螢幕兩指 ----------
    const touches = new Map<number, Point>();
    let pinch: { dist: number; zoom: number; mid: Point } | null = null;
    let pan: Point | null = null;

    const midDist = () => {
      const [a, b] = [...touches.values()];
      return {
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      };
    };

    // capture 階段：在畫布 / 物件收到事件之前攔截
    st.addEventListener(
      'pointerdown',
      e => {
        if (e.pointerType !== 'touch') return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        // 只用筆畫圖時，單指在畫布上拖曳 = 平移（物件與操作列仍可用手指操作）
        const onControl = (e.target as Element).closest?.('.paste-obj, .obj-bar, .sel-box, .resize-handle');
        if (touches.size === 1 && store.get('penOnly') && !onControl) {
          pan = { x: e.clientX, y: e.clientY };
          e.stopPropagation();
        }
        if (touches.size === 2) {
          pan = null;
          app.cancelStroke(); // 第一根手指可能已開始畫，撤銷它
          app.isPinching = true;
          const { mid, dist } = midDist();
          pinch = { dist, zoom: store.get('zoom'), mid };
        }
        if (app.isPinching) e.stopPropagation();
      },
      true,
    );

    st.addEventListener(
      'pointermove',
      e => {
        if (!touches.has(e.pointerId)) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pan && touches.size === 1) {
          st.scrollLeft -= e.clientX - pan.x;
          st.scrollTop -= e.clientY - pan.y;
          pan = { x: e.clientX, y: e.clientY };
          e.stopPropagation();
          return;
        }
        if (!app.isPinching) return;
        e.stopPropagation();
        if (touches.size < 2 || !pinch) return;
        const { mid, dist } = midDist();
        setZoom((pinch.zoom * dist) / pinch.dist, mid.x, mid.y);
        st.scrollLeft -= mid.x - pinch.mid.x; // 兩指平移
        st.scrollTop -= mid.y - pinch.mid.y;
        pinch.mid = mid;
      },
      true,
    );

    const up = (e: PointerEvent) => {
      if (!touches.delete(e.pointerId)) return;
      if (app.isPinching) e.stopPropagation();
      if (touches.size < 2) pinch = null;
      if (touches.size === 0) pan = null;
      if (touches.size === 0) app.isPinching = false; // 全部手指離開才恢復繪圖
    };
    st.addEventListener('pointerup', up, true);
    st.addEventListener('pointercancel', up, true);
  }

  layout();
  return { setZoom, zoomTo, zoomIn, zoomOut, reset, bind };
}

export type Zoom = ReturnType<typeof createZoom>;
