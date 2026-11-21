import { h } from '../engine/utils/dom';
import { getTool } from '../engine/tools';

export function createStatusBar(app) {
  const { store } = app;
  const posEl = h('span');
  const sizeEl = h('span');
  const toolEl = h('span');

  const zoomLabel = h('button', {
    class: 'zoom-label',
    dataset: { action: 'zoom-reset' },
    title: '重設為 100% (Ctrl/⌘+0)',
    onClick: () => app.zoom.reset(),
  });
  const zoomEl = h(
    'span',
    { class: 'zoom' },
    h(
      'button',
      { dataset: { action: 'zoom-out' }, title: '縮小 (Ctrl/⌘+-)', onClick: () => app.zoom.zoomOut() },
      '−',
    ),
    zoomLabel,
    h(
      'button',
      { dataset: { action: 'zoom-in' }, title: '放大 (Ctrl/⌘+=)', onClick: () => app.zoom.zoomIn() },
      '+',
    ),
  );

  const renderPos = p => {
    posEl.textContent = p ? `座標：${p.x}, ${p.y}` : '座標：-';
  };
  const renderSize = s => {
    sizeEl.textContent = `畫布：${s.w} × ${s.h}`;
  };
  const renderTool = id => {
    toolEl.textContent = `工具：${getTool(id)?.name ?? id}`;
  };
  const renderZoom = z => {
    zoomLabel.textContent = `${Math.round(z * 100)}%`;
  };

  store.on('cursorPos', renderPos);
  store.on('canvasSize', renderSize);
  store.on('tool', renderTool);
  store.on('zoom', renderZoom);
  renderPos(store.get('cursorPos'));
  renderSize(store.get('canvasSize'));
  renderTool(store.get('tool'));
  renderZoom(store.get('zoom'));

  return h('div', { class: 'statusbar' }, posEl, sizeEl, toolEl, zoomEl);
}
