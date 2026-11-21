import type { Ref } from 'vue';
import { createI18n } from 'vue-i18n';
import zhTW from './zh-TW';
import en from './en';

export type MessageSchema = typeof zhTW;
export type Locale = 'zh-TW' | 'en';

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'zh-TW', label: '中文' },
  { value: 'en', label: 'English' },
];

const STORAGE_KEY = 'doodle-pad:locale';

/** 使用者選過的語言 → 瀏覽器語言（中文顯示繁中，其他顯示英文） */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-TW' || saved === 'en') return saved;
  } catch {
    /* 私密瀏覽等情況 */
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some(l => l?.toLowerCase().startsWith('zh')) ? 'zh-TW' : 'en';
}

export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'zh-TW',
  messages: { 'zh-TW': zhTW, en },
});

/** 切換語言並記住選擇 */
export function setLocale(locale: Locale) {
  // composition 模式（legacy: false）下 locale 是 ref
  (i18n.global.locale as unknown as Ref<Locale>).value = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* 私密瀏覽等情況 */
  }
}
