import { h } from '../../../utils/dom.js';
import { createGroup } from '../../components/group.js';
import { createButton } from '../../components/button.js';
import { newCanvas, saveCanvas, openImage } from '../../../services/fileService.js';

export function createFileSection(app) {
  const fileInput = h('input', {
    type: 'file', accept: 'image/*', hidden: true,
    onChange: () => { openImage(app, fileInput.files[0]); fileInput.value = ''; },
  });

  return createGroup('檔案', [
    createButton({ action: 'new', label: '🗋 新增', title: '新增（清空畫布）', onClick: () => newCanvas(app) }),
    createButton({ action: 'open', label: '📂 開啟', title: '開啟圖片', onClick: () => fileInput.click() }),
    createButton({ action: 'save', label: '💾 儲存', title: '儲存為 PNG (Ctrl/⌘+S)', onClick: () => saveCanvas(app) }),
    fileInput,
  ]);
}
