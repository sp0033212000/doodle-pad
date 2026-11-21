import { createGroup } from '../../components/group.js';
import { createButton } from '../../components/button.js';
import { openResizeDialog } from '../../dialogs/ResizeDialog.js';

export function createImageSection(app) {
  const cropBtn = createButton({
    action: 'crop',
    label: '⌗ 裁切',
    title: '把畫布裁切成選取範圍 (Ctrl/⌘+Shift+X)',
    onClick: () => app.image.crop(),
  });
  const resizeBtn = createButton({
    action: 'resize',
    label: '⤡ 調整大小',
    title: '調整選取的物件、選取範圍或整張圖片的大小',
    onClick: () => openResizeDialog(app),
  });

  const sync = () => { cropBtn.disabled = !app.store.get('hasRegion'); };
  app.store.on('hasRegion', sync);
  sync();

  return createGroup('影像', [cropBtn, resizeBtn]);
}
