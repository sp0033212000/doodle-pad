import { h } from '../../engine/utils/dom';

/** 工具列中的一個區塊：內容 + 底部標籤 */
export function createGroup(label, children, { bodyClass = '' } = {}) {
  return h(
    'div',
    { class: 'group' },
    h('div', { class: `group-body ${bodyClass}`.trim() }, children),
    h('div', { class: 'group-label' }, label),
  );
}
