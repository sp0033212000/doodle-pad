/**
 * 鍵盤工具。
 *
 * keyOf(e)：以「實體按鍵」(e.code) 取得按鍵名稱。
 *   使用中文輸入法（注音、倉頡…）時，e.key 可能是「ㄈ」而不是「z」，
 *   導致 Cmd+Z、工具快捷鍵失效；e.code 不受輸入法影響。
 */
const CODE_MAP: Record<string, string> = {
  Equal: '=',
  Minus: '-',
  BracketLeft: '[',
  BracketRight: ']',
  NumpadAdd: '+',
  NumpadSubtract: '-',
};

type KeyLike = Pick<KeyboardEvent, 'code' | 'key'>;

export function keyOf(e: KeyLike): string {
  const { code } = e;
  if (code?.startsWith('Key')) return code.slice(3).toLowerCase(); // KeyZ → z
  if (code?.startsWith('Digit')) return code.slice(5); // Digit0 → 0
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  return (e.key || '').toLowerCase();
}

export const isMod = (e: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey'>) => e.metaKey || e.ctrlKey;

const NON_TEXT_INPUTS = ['range', 'color', 'checkbox', 'radio', 'button', 'submit', 'file'];

/** 可輸入文字的欄位：這裡的按鍵（含 Cmd+Z）交給瀏覽器原生處理 */
export function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !NON_TEXT_INPUTS.includes(el.type);
}

/** 表單控制項（滑桿、下拉選單…）：方向鍵等一般按鍵留給它們 */
export function isFormControl(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
}

/**
 * 是否應忽略此按鍵事件：
 *  - 對話框開啟中、輸入法組字中：全部忽略
 *  - 文字欄位內：全部忽略
 *  - 其他表單控制項內：只處理帶 Cmd/Ctrl 的組合鍵
 */
export function shouldIgnore(e: KeyboardEvent): boolean {
  if (e.isComposing) return true;
  if (document.querySelector('.dialog-backdrop')) return true;
  if (isTextField(e.target)) return true;
  return isFormControl(e.target) && !isMod(e);
}
