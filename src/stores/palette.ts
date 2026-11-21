import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { normalizeHex } from '../engine/utils/color';

export const CUSTOM_LIMIT = 14;
export const RECENT_LIMIT = 10;

const CUSTOM_KEY = 'doodle-pad:customColors';
const RECENT_KEY = 'doodle-pad:recentColors';

function load(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(raw) ? raw.map(c => normalizeHex(String(c))).filter((c): c is string => !!c) : [];
  } catch {
    return [];
  }
}

function save(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* 私密瀏覽等情況 */
  }
}

/**
 * 使用者的色彩（存在瀏覽器，跨作品共用）：
 *  - 自訂色彩：最多 14 個，由「編輯色彩」加入、刪除
 *  - 最近使用：自動記錄最近選用的 10 個顏色
 */
export const usePaletteStore = defineStore('palette', () => {
  const custom = ref<string[]>(load(CUSTOM_KEY));
  const recent = ref<string[]>(load(RECENT_KEY));

  watch(custom, list => save(CUSTOM_KEY, list), { deep: true });
  watch(recent, list => save(RECENT_KEY, list), { deep: true });

  function addCustom(color: string) {
    const c = normalizeHex(color);
    if (!c || custom.value.includes(c)) return;
    custom.value = [...custom.value, c].slice(-CUSTOM_LIMIT);
  }

  function removeCustom(color: string) {
    custom.value = custom.value.filter(c => c !== color);
  }

  function addRecent(color: string) {
    const c = normalizeHex(color);
    if (!c) return;
    recent.value = [c, ...recent.value.filter(x => x !== c)].slice(0, RECENT_LIMIT);
  }

  return { custom, recent, addCustom, removeCustom, addRecent };
});
