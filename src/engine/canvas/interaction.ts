import type { App, ToolSession } from '../types';

/**
 * 把畫布上的指標事件轉交給目前選用的工具（介面見 types.ts 的 Tool）。
 *
 * Apple Pencil / 觸控筆：
 *  - 第一次偵測到筆時，自動切換成「只用筆畫圖」（使用者手動設定過則尊重設定）
 *  - 只用筆畫圖時，手指不畫圖（由 zoom 模組處理單指平移、兩指縮放）
 *  - 傳遞下筆力道（pressure）給工具，並使用 coalesced events 讓快速筆畫更平滑
 */
export function bindInteraction(app: App) {
  const { canvas } = app.canvas;
  const { store } = app;
  let session: ToolSession | null = null;

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  app.cancelStroke = () => {
    if (!session) return;
    clearInterval(session.timer);
    session = null;
    app.canvas.clearOverlay();
    app.history.revert();
  };

  /** 左鍵 + 「使用次色」開關 → 視為右鍵（次色） */
  const effectiveButton = (e: PointerEvent) => (e.button === 0 && store.get('useSecondary') ? 2 : e.button);

  function notePen(e: PointerEvent) {
    if (e.pointerType !== 'pen' || store.get('penDetected')) return;
    store.set('penDetected', true);
    if (store.get('penOnlyAuto')) store.set('penOnly', true);
  }

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    notePen(e);
    if (e.pointerType === 'touch' && store.get('penOnly')) return; // 手指交給平移 / 縮放
    if (session || app.isPinching || store.get('readOnly')) return;
    e.preventDefault();
    app.finishPending();

    const tool = app.getTool();
    const p = app.canvas.toPos(e);
    const s: ToolSession = {
      button: effectiveButton(e),
      start: p,
      last: p,
      shift: e.shiftKey,
      pointerType: e.pointerType,
      pressure: e.pressure || 0.5,
    };

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

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件或指標已失效 */
    }
    session = s;
  });

  canvas.addEventListener('pointermove', e => {
    const p = app.canvas.toPos(e);
    store.set('cursorPos', p);
    const tool = app.getTool();

    if (!session) {
      tool.onHover?.(app, p);
      return;
    }
    // 筆的取樣頻率比畫面更新高，逐一處理被合併的事件
    const coalesced = e.getCoalescedEvents?.() ?? [];
    for (const ev of coalesced.length ? coalesced : [e]) {
      const q = app.canvas.toPos(ev);
      if (ev.pressure) session.pressure = ev.pressure;
      session.shift = e.shiftKey;
      tool.onMove?.(app, q, session);
      session.last = q;
    }
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
    store.set('cursorPos', null);
    if (!session) app.canvas.clearOverlay();
  });
}
