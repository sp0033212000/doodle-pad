import type { App, ToolSession } from '../types';

/**
 * 把畫布上的指標事件轉交給目前選用的工具（介面見 types.ts 的 Tool）。
 */
export function bindInteraction(app: App) {
  const { canvas } = app.canvas;
  let session: ToolSession | null = null;

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  app.cancelStroke = () => {
    if (!session) return;
    clearInterval(session.timer);
    session = null;
    app.canvas.clearOverlay();
    app.history.revert();
  };

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    if (session || app.isPinching || app.store.get('readOnly')) return;
    e.preventDefault();
    app.finishPending();

    const tool = app.getTool();
    const p = app.canvas.toPos(e);
    const s: ToolSession = { button: e.button, start: p, last: p, shift: e.shiftKey };

    // 用一般繪圖工具在畫布上按下 → 取消選取範圍
    if (!tool.isSelection) app.selection.clear();

    // 整個按下 → 放開期間的修改合併成復原紀錄中的同一步
    app.history.beginGroup();
    if (tool.modifiesCanvas !== false) app.history.push();
    tool.onDown?.(app, p, s);
    if (tool.oneShot) {
      app.history.endGroup();
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    session = s;
  });

  canvas.addEventListener('pointermove', e => {
    const p = app.canvas.toPos(e);
    app.store.set('cursorPos', p);
    const tool = app.getTool();

    if (!session) {
      tool.onHover?.(app, p);
      return;
    }
    session.shift = e.shiftKey;
    tool.onMove?.(app, p, session);
    session.last = p;
  });

  const end = (e: PointerEvent) => {
    if (!session) return;
    const s = session;
    session = null;
    s.shift = e.shiftKey;
    app.getTool().onUp?.(app, app.canvas.toPos(e), s);
    app.history.endGroup();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('pointerleave', () => {
    app.store.set('cursorPos', null);
    if (!session) app.canvas.clearOverlay();
  });
}
