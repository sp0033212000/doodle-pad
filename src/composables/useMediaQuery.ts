import { onBeforeUnmount, ref } from 'vue';

/** 響應式的 CSS media query */
export function useMediaQuery(query: string) {
  const mql = window.matchMedia(query);
  const matches = ref(mql.matches);
  const update = (e: MediaQueryListEvent) => (matches.value = e.matches);
  mql.addEventListener('change', update);
  onBeforeUnmount(() => mql.removeEventListener('change', update));
  return matches;
}

/** 窄螢幕（平板直向、手機）：改用側邊工具列 + 可展開的設定面板 */
export const COMPACT_QUERY = '(max-width: 899px)';
