import { MAX_HISTORY } from '../config.js';

/**
 * 復原 / 重做。
 * 每個快照 = 畫布像素 + 物件圖層狀態（未鎖定的貼上物件）。
 */
export function createHistory(app) {
  const undoStack = [];
  const redoStack = [];

  const take = () => ({
    image: app.canvas.snapshot(),
    objects: app.objects?.serialize() ?? [],
  });
  const apply = snap => {
    app.selection?.clear();
    app.canvas.restore(snap.image);
    app.objects?.load(snap.objects);
  };

  const sync = () => {
    app.store.set('canUndo', undoStack.length > 0);
    app.store.set('canRedo', redoStack.length > 0);
  };

  return {
    /** 在修改「之前」呼叫 */
    push() {
      undoStack.push(take());
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack.length = 0;
      sync();
    },

    /** 撤銷最後一次 push（不進入重做堆疊），用於取消進行中的筆畫 */
    revert() {
      if (!undoStack.length) return;
      apply(undoStack.pop());
      sync();
    },

    undo() {
      app.finishPending();
      if (!undoStack.length) return;
      redoStack.push(take());
      apply(undoStack.pop());
      sync();
    },

    redo() {
      app.finishPending();
      if (!redoStack.length) return;
      undoStack.push(take());
      apply(redoStack.pop());
      sync();
    },
  };
}
