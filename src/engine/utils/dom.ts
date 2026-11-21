type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown>;

/**
 * 建立 DOM 元素的小工具。
 *   h('button', { class: 'act', onClick: fn }, '文字')
 * props 中 on* 開頭的函式會註冊為事件；style / dataset 可傳物件。
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = String(value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'dataset' && typeof value === 'object') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) el.setAttribute(key, '');
    else if (value !== false && value != null) el.setAttribute(key, String(value));
  }
  const flat = children.flat().filter((c): c is Node | string | number => c != null && c !== false);
  el.append(...flat.map(c => (typeof c === 'number' ? String(c) : c)));
  return el;
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** 建立指定大小的 canvas 與 2D context */
export function createCanvas2D(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! };
}
