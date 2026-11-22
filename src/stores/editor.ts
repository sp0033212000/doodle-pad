import { defineStore } from 'pinia';
import { markRaw, reactive, ref, toRefs } from 'vue';
import {
  DEFAULT_STATE,
  exportProject,
  newCanvas,
  openFile,
  saveCanvas,
  type App,
  type AppState,
  type ShapeMode,
} from '../engine';

const PEN_ONLY_KEY = 'doodle-pad:penOnly';

export type DialogName = 'resize' | 'quota' | 'export' | 'clearHistory' | 'colors';

/**
 * 介面狀態（Pinia）。
 *  - 以響應式的方式「鏡像」引擎 store 的狀態，元件直接讀取
 *  - 所有修改都轉交給引擎；引擎本身以 markRaw 保存，不讓 Vue 追蹤它的內部
 */
export const useEditorStore = defineStore('editor', () => {
  const state = reactive<AppState>({ ...DEFAULT_STATE });
  const dialog = ref<DialogName | null>(null);
  /** 編輯色彩對話框要編輯的是主色還是次色 */
  const colorTarget = ref<'primary' | 'secondary'>('primary');
  let engine: App | null = null;

  function mirror<K extends keyof AppState>(app: App, key: K) {
    (state as AppState)[key] = app.store.get(key);
    app.store.on(key, value => {
      (state as AppState)[key] = value;
    });
  }

  /** 綁定引擎實例（App.vue 建立引擎後呼叫一次） */
  function bind(app: App) {
    engine = markRaw(app);
    (Object.keys(DEFAULT_STATE) as (keyof AppState)[]).forEach(key => mirror(app, key));
    // 使用者手動設定過「只用筆畫圖」時，沿用該設定（不再自動切換）
    const saved = readPref(PEN_ONLY_KEY);
    if (saved !== null) {
      app.store.set('penOnlyAuto', false);
      app.store.set('penOnly', saved === 'true');
    }
  }

  function readPref(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  const e = (): App => {
    if (!engine) throw new Error('engine is not bound');
    return engine;
  };

  return {
    ...toRefs(state),
    dialog,
    colorTarget,
    bind,
    engine: e,

    setTool: (id: string) => e().setTool(id),
    setSize: (v: number) => e().store.set('size', v),
    setShapeMode: (m: ShapeMode) => e().store.set('shapeMode', m),
    setMagnify: (v: number) => e().store.set('magnify', v),
    setPrimary: (c: string) => e().store.set('primary', c),
    setSecondary: (c: string) => e().store.set('secondary', c),
    swapColors: () => e().swapColors(),
    toggleSecondary: () => e().store.set('useSecondary', !e().store.get('useSecondary')),
    setPenOnly(value: boolean) {
      e().store.set('penOnlyAuto', false);
      e().store.set('penOnly', value);
      try {
        localStorage.setItem(PEN_ONLY_KEY, String(value));
      } catch {
        /* 私密瀏覽等情況 */
      }
    },

    undo: () => e().history.undo(),
    redo: () => e().history.redo(),
    cut: () => e().cut(),
    copy: () => e().copy(),
    paste: () => e().clipboard.paste(),
    crop: () => e().image.crop(),
    clearHistory: () => e().history.clear(),

    zoomIn: () => e().zoom.zoomIn(),
    zoomOut: () => e().zoom.zoomOut(),
    zoomReset: () => e().zoom.reset(),

    newCanvas: () => newCanvas(e()),
    save: () => saveCanvas(e()),
    openFile: (file: File | null | undefined) => openFile(e(), file),
    exportProject: (includeHistory: boolean) => exportProject(e(), { includeHistory }),

    openDialog: (name: DialogName) => {
      dialog.value = name;
    },
    openColorEditor: (target: 'primary' | 'secondary') => {
      colorTarget.value = target;
      dialog.value = 'colors';
    },
    closeDialog: () => {
      dialog.value = null;
    },
  };
});
