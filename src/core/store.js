/**
 * 極簡的狀態管理：get / set / on(key, fn)。
 * UI 模組只透過 store 溝通，彼此不直接依賴。
 */
export function createStore(initial) {
  const state = { ...initial };
  const listeners = new Map();

  return {
    get: key => state[key],

    set(key, value) {
      if (state[key] === value) return;
      state[key] = value;
      listeners.get(key)?.forEach(fn => fn(value));
    },

    /** 訂閱某個 key 的變化，回傳取消訂閱函式 */
    on(key, fn) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(fn);
      return () => listeners.get(key).delete(fn);
    },
  };
}
