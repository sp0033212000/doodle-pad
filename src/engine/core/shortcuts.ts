import type { App } from '../types';
import { SIZE_RANGE } from '../config';
import { clamp } from '../utils/dom';
import { keyOf, isMod, shouldIgnore } from '../utils/keys';
import { saveCanvas } from '../services/fileService';

export function bindShortcuts(app: App) {
  // 工具快捷鍵直接取自各工具的 key 設定
  const toolKeys = Object.fromEntries(app.tools.map(t => [t.key, t.id]));

  window.addEventListener('keydown', e => {
    if (shouldIgnore(e)) return;
    const mod = isMod(e);
    const k = keyOf(e);

    if (mod && k === 'z' && !e.shiftKey) {
      e.preventDefault();
      app.history.undo();
    } else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) {
      e.preventDefault();
      app.history.redo();
    } else if (mod && k === 's') {
      e.preventDefault();
      saveCanvas(app);
    } else if (mod && (k === '=' || k === '+')) {
      e.preventDefault();
      app.zoom.zoomIn();
    } else if (mod && k === '-') {
      e.preventDefault();
      app.zoom.zoomOut();
    } else if (mod && k === '0') {
      e.preventDefault();
      app.zoom.reset();
    } else if (mod || e.altKey)
      return; // 其他組合鍵（含 Ctrl/⌘+V）交給瀏覽器
    else if (toolKeys[k]) app.setTool(toolKeys[k]);
    else if (k === 'x') app.swapColors();
    else if (k === '[' || k === ']') {
      const next = app.store.get('size') + (k === ']' ? 1 : -1);
      app.store.set('size', clamp(next, SIZE_RANGE.min, SIZE_RANGE.max));
    }
  });
}
