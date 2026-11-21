/**
 * 鍵盤工具。
 *
 * keyOf(e)：以「實體按鍵」(e.code) 取得按鍵名稱。
 *   使用中文輸入法（注音、倉頡…）時，e.key 可能是「ㄈ」而不是「z」，
 *   導致 Cmd+Z、工具快捷鍵失效；e.code 不受輸入法影響。
 */
const CODE_MAP = {
  Equal: '=', Minus: '-', BracketLeft: '[', BracketRight: ']',
  NumpadAdd: '+', NumpadSubtract: '-',
};

export function keyOf(e) {
  const { code } = e;
  if (code?.startsWith('Key')) return code.slice(3).toLowerCase();   // KeyZ → z
  if (code?.startsWith('Digit')) return code.slice(5);               // Digit0 → 0
  if (CODE_MAP[code]) return CODE_MAP[code];
  return (e.key || '').toLowerCase();
}

export const isMod = e => e.metaKey || e.ctrlKey;

/** 可輸入文字的欄位：這裡的按鍵（含 Cmd+Z）交給瀏覽器原生處理 */
export function isTextField(el) {
  if (!el) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  return !['range', 'color', 'checkbox', 'radio', 'button', 'submit', 'file'].includes(el.type);
}

/** 表單控制項（滑桿、下拉選單…）：方向鍵等一般按鍵留給它們 */
export function isFormControl(el) {
  return !!el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
}

/**
 * 是否應忽略此按鍵事件：
 *  - 文字欄位內：全部忽略
 *  - 其他表單控制項內：只處理帶 Cmd/Ctrl 的組合鍵
 */
export function shouldIgnore(e) {
  if (e.isComposing) return true;
  if (document.querySelector('.dialog-backdrop')) return true;   // 對話框開啟中
  if (isTextField(e.target)) return true;
  return isFormControl(e.target) && !isMod(e);
}
