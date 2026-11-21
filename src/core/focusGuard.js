import { isTextField } from '../utils/keys.js';

/**
 * 防止點擊時 div / 按鈕 / 畫布取得焦點（避免出現焦點框、
 * 按鈕吃掉 Space / Enter、快捷鍵被擋住）。
 * 只有文字欄位、下拉選單、滑桿等真正需要焦點的控制項，以及對話框內部例外。
 */
function needsFocus(el) {
  if (!el || !el.closest) return false;
  if (el.closest('.dialog')) return true;
  if (isTextField(el)) return true;
  return el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'LABEL';
}

export function bindFocusGuard() {
  document.addEventListener('pointerdown', e => {
    if (needsFocus(e.target)) return;
    e.preventDefault();   // 阻止預設的「取得焦點」與文字選取（click 事件仍會觸發）
    const active = document.activeElement;
    if (active && active !== document.body && !active.contains(e.target)) active.blur();
  }, true);
}
