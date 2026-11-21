import { createI18n } from 'vue-i18n';
import zhTW from './zh-TW';

export type MessageSchema = typeof zhTW;

export const i18n = createI18n<[MessageSchema], 'zh-TW'>({
  legacy: false,
  locale: 'zh-TW',
  fallbackLocale: 'zh-TW',
  messages: { 'zh-TW': zhTW },
});
