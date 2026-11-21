import { h } from '../../utils/dom.js';

export function createButton({ label, title, onClick, className = 'act', dataset }) {
  return h('button', { class: className, title, dataset, onClick }, label);
}
