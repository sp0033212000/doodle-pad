/**
 * 極簡的狀態管理：get / set / on(key, fn)。
 * 引擎各模組與介面層只透過 store 溝通，彼此不直接依賴。
 */
export interface Store<S extends object> {
  get<K extends keyof S>(key: K): S[K];
  set<K extends keyof S>(key: K, value: S[K]): void;
  /** 訂閱某個 key 的變化，回傳取消訂閱函式 */
  on<K extends keyof S>(key: K, fn: (value: S[K]) => void): () => void;
  /** 目前完整狀態的淺拷貝 */
  snapshot(): S;
}

export function createStore<S extends object>(initial: S): Store<S> {
  const state = { ...initial };
  const listeners = new Map<keyof S, Set<(value: never) => void>>();

  return {
    get: key => state[key],

    set(key, value) {
      if (state[key] === value) return;
      state[key] = value;
      listeners.get(key)?.forEach(fn => (fn as (v: typeof value) => void)(value));
    },

    on(key, fn) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      const set = listeners.get(key)!;
      set.add(fn as (value: never) => void);
      return () => set.delete(fn as (value: never) => void);
    },

    snapshot: () => ({ ...state }),
  };
}
