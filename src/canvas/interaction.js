/**
 * 把畫布上的指標事件轉交給目前選用的工具。
 *
 * 工具介面（皆為選用）：
 *   onDown(app, p, session)   按下
 *   onMove(app, p, session)   拖曳中
 *   onUp(app, p, session)     放開
 *   onHover(app, p)           未按下時移動
 *   modifiesCanvas: false     不自動記錄復原點
 *   oneShot: true             按一下即完成，不追蹤拖曳
 */
export function bindInteraction(app) {
  const { canvas } = app.canvas;
  let session = null;

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /** 中止進行中的筆畫並還原（例如觸控時第二根手指放下，改為捏合縮放） */
  app.cancelStroke = () => {
    if (!session) return;
    clearInterval(session.timer);
    session = null;
    app.canvas.clearOverlay();
    app.history.revert();
  };

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    if (session || app.isPinching) return;
    e.preventDefault();
    app.finishPending();

    const tool = app.getTool();
    const p = app.canvas.toPos(e);
    const s = { button: e.button, start: p, last: p, shift: e.shiftKey };

    // 用一般繪圖工具在畫布上按下 → 取消選取範圍
    if (!tool.isSelection) app.selection.clear();

    if (tool.modifiesCanvas !== false) app.history.push();
    tool.onDown?.(app, p, s);
    if (tool.oneShot) return;

    canvas.setPointerCapture(e.pointerId);
    session = s;
  });

  canvas.addEventListener('pointermove', e => {
    const p = app.canvas.toPos(e);
    app.store.set('cursorPos', p);
    const tool = app.getTool();

    if (!session) { tool.onHover?.(app, p); return; }
    session.shift = e.shiftKey;
    tool.onMove?.(app, p, session);
    session.last = p;
  });

  const end = e => {
    if (!session) return;
    session.shift = e.shiftKey;
    app.getTool().onUp?.(app, app.canvas.toPos(e), session);
    session = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('pointerleave', () => {
    app.store.set('cursorPos', null);
    if (!session) app.canvas.clearOverlay();
  });
}
