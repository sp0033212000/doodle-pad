import { h } from '../../utils/dom.js';

/**
 * 簡易模態對話框。
 *   openDialog({ title, body, okLabel, onOk })
 * onOk 回傳 false 時不關閉。Enter = 確定、Esc = 取消、點背景 = 取消。
 */
export function openDialog({ title, body, okLabel = '確定', onOk }) {
  const close = () => backdrop.remove();
  const ok = () => { if (onOk?.() !== false) close(); };

  const dialog = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'dialog-title' }, title),
    h('div', { class: 'dialog-body' }, body),
    h('div', { class: 'dialog-actions' },
      h('button', { class: 'act', dataset: { action: 'dialog-cancel' }, onClick: close }, '取消'),
      h('button', { class: 'act primary', dataset: { action: 'dialog-ok' }, onClick: ok }, okLabel),
    ),
  );
  const backdrop = h('div', {
    class: 'dialog-backdrop',
    onPointerdown: e => { if (e.target === backdrop) close(); },
  }, dialog);

  dialog.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); ok(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    e.stopPropagation();
  });

  document.body.append(backdrop);
  // 自動聚焦第一個輸入欄位
  const first = dialog.querySelector('input[type=number], input[type=text]');
  setTimeout(() => { first?.focus(); first?.select(); }, 0);
  return { close };
}
