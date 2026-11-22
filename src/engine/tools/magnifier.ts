import type { App, Point, Tool } from '../types';
import { clamp } from '../utils/dom';

/**
 * 放大鏡：以「1 個畫布像素 = N 個螢幕像素」的倍率放大局部，方便逐像素編輯。
 *  - 滑過畫布：顯示放大後會看到的範圍
 *  - 點一下：以該點為中心放大
 *  - 拖曳：選取範圍，以範圍中心放大
 *  - 右鍵：縮回 100%
 * 放大後自動切回原本的工具，直接開始編輯。
 */

/** 拖曳距離小於這個值（畫布像素）視為點一下 */
const CLICK_SLOP = 2;

let previousTool = 'pencil';

/** 以倍率 f 放大時，可見區域對應的畫布範圍（以 p 為中心，不超出畫布） */
function visibleRect(app: App, p: Point) {
  const f = app.store.get('magnify');
  const w = Math.min(app.canvas.width, app.stage.clientWidth / f);
  const h = Math.min(app.canvas.height, app.stage.clientHeight / f);
  return {
    x: clamp(p.x - w / 2, 0, app.canvas.width - w),
    y: clamp(p.y - h / 2, 0, app.canvas.height - h),
    w,
    h,
  };
}

function outline(app: App, r: { x: number; y: number; w: number; h: number }) {
  const { octx } = app.canvas;
  // 外框維持 1 螢幕像素寬
  const lw = 1 / app.store.get('zoom');
  app.canvas.clearOverlay();
  octx.save();
  octx.lineWidth = lw;
  octx.setLineDash([4 * lw, 3 * lw]);
  octx.strokeStyle = '#000';
  octx.strokeRect(r.x, r.y, r.w, r.h);
  octx.lineDashOffset = 3.5 * lw;
  octx.strokeStyle = '#fff';
  octx.strokeRect(r.x, r.y, r.w, r.h);
  octx.restore();
}

const dragRect = (a: Point, b: Point) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x) + 1,
  h: Math.abs(b.y - a.y) + 1,
});

const isClick = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) <= CLICK_SLOP && Math.abs(a.y - b.y) <= CLICK_SLOP;

const magnifier: Tool = {
  id: 'magnifier',
  name: '放大鏡',
  icon: '🔍',
  key: 'z',
  cursor: 'zoom-in',
  modifiesCanvas: false,
  init(app) {
    app.store.on('tool', id => {
      if (id !== 'magnifier') previousTool = id;
    });
  },
  onHover(app, p) {
    outline(app, visibleRect(app, p));
  },
  onDown(app, p, s) {
    if (s.button !== 2) outline(app, visibleRect(app, p));
  },
  onMove(app, p, s) {
    if (s.button === 2) return;
    outline(app, isClick(s.start, p) ? visibleRect(app, p) : dragRect(s.start, p));
  },
  onUp(app, p, s) {
    app.canvas.clearOverlay();
    if (s.button === 2) {
      app.zoom.zoomTo(1, p.x + 0.5, p.y + 0.5);
      return;
    }
    const r = isClick(s.start, p) ? { x: p.x, y: p.y, w: 1, h: 1 } : dragRect(s.start, p);
    app.zoom.zoomTo(app.store.get('magnify'), r.x + r.w / 2, r.y + r.h / 2);
    app.setTool(previousTool);
  },
};

export default magnifier;
