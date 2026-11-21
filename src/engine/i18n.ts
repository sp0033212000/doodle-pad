/**
 * 引擎的介面文字翻譯（不依賴任何 i18n 套件）。
 *
 * 引擎產生的 DOM（物件 / 選取的操作列、提示訊息）只記錄翻譯鍵，
 * 由介面層用 setTranslator() 提供實際翻譯；切換語言後呼叫 applyLabels() 重新套用。
 */
export type Translator = (key: string, params?: Record<string, unknown>) => string;

let translate: Translator = key => key;

export function setTranslator(fn: Translator) {
  translate = fn;
}

export const tr: Translator = (key, params) => translate(key, params);

/** 元素文字 / 提示的翻譯屬性；icon 會加在文字前面 */
export function labelProps(opts: { text?: string; title?: string; icon?: string }) {
  const dataset: Record<string, string> = {};
  if (opts.text) dataset.i18n = opts.text;
  if (opts.title) dataset.i18nTitle = opts.title;
  if (opts.icon) dataset.icon = opts.icon;
  return {
    dataset,
    title: opts.title ? tr(opts.title) : undefined,
    text: renderText(opts.text, opts.icon),
  };
}

function renderText(key?: string, icon?: string) {
  const label = key ? tr(key) : '';
  return [icon, label].filter(Boolean).join(' ');
}

/** 依 data-i18n / data-i18n-title 重新套用目前語言的文字 */
export function applyLabels(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-i18n], [data-i18n-title]').forEach(el => {
    if (el.dataset.i18n) el.textContent = renderText(el.dataset.i18n, el.dataset.icon);
    if (el.dataset.i18nTitle) el.title = tr(el.dataset.i18nTitle);
  });
}
