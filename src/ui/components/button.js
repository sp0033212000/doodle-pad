import { h } from '../../utils/dom.js';

/** action：穩定的 data-action 識別名稱，供 E2E 測試與樣式使用 */
export function createButton({ label, title, onClick, className = 'act', dataset, action }) {
  return h('button', { class: className, title, dataset: { ...dataset, ...(action && { action }) }, onClick }, label);
}
