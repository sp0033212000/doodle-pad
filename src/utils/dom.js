/**
 * 建立 DOM 元素的小工具。
 *   h('button', { class: 'act', onClick: fn }, '文字')
 * props 中 on* 開頭的函式會註冊為事件；style 可傳物件。
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) el.setAttribute(key, '');
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  el.append(...children.flat().filter(c => c != null && c !== false));
  return el;
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
