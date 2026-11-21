import { createGroup } from '../../components/group.js';
import { createButton } from '../../components/button.js';

export function createEditSection(app) {
  const { store } = app;
  const undoBtn = createButton({ action: 'undo', label: '↶', title: '復原 (Ctrl/⌘+Z)', onClick: () => app.history.undo() });
  const redoBtn = createButton({ action: 'redo', label: '↷', title: '重做 (Ctrl/⌘+Y)', onClick: () => app.history.redo() });
  const cutBtn = createButton({ action: 'cut', label: '✂️ 剪下', title: '剪下選取的範圍或物件 (Ctrl/⌘+X)', onClick: () => app.cut() });
  const copyBtn = createButton({ action: 'copy', label: '📄 複製', title: '複製選取的範圍或物件 (Ctrl/⌘+C)', onClick: () => app.copy() });
  const pasteBtn = createButton({ action: 'paste', label: '📋 貼上', title: '貼上 (Ctrl/⌘+V)', onClick: () => app.clipboard.paste() });

  // 按下工具列按鈕時不要先觸發「取消選取」
  [cutBtn, copyBtn].forEach(b => b.addEventListener('pointerdown', e => e.preventDefault()));

  const sync = () => {
    undoBtn.disabled = !store.get('canUndo');
    redoBtn.disabled = !store.get('canRedo');
    cutBtn.disabled = copyBtn.disabled = !store.get('hasSelection') && !store.get('hasRegion');
  };
  ['canUndo', 'canRedo', 'hasSelection', 'hasRegion'].forEach(k => store.on(k, sync));
  sync();

  return createGroup('編輯', [undoBtn, redoBtn, cutBtn, copyBtn, pasteBtn]);
}
