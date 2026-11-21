import type { App, AppState } from './types';
import { DEFAULT_STATE, CANVAS_DEFAULT } from './config';
import { createStore } from './core/store';
import { createHistory } from './core/history';
import { createAssetStore } from './core/assets';
import { bindShortcuts } from './core/shortcuts';
import { bindFocusGuard } from './core/focusGuard';
import { createCanvas } from './canvas/canvasManager';
import { createResizeHandle } from './canvas/resizeHandle';
import { bindInteraction } from './canvas/interaction';
import { createObjectLayer } from './canvas/objectLayer';
import { createSelection } from './canvas/selection';
import { createZoom } from './canvas/zoom';
import { TOOLS, getTool } from './tools';
import { createClipboard } from './services/clipboard';
import { createImageOps } from './services/imageOps';
import { bindDropToOpen } from './services/fileService';
import { h, clamp } from './utils/dom';

export type { App, AppState, Tool, Point, Rect, ShapeMode } from './types';
export { PALETTE, SHAPE_MODES, SIZE_RANGE, DEFAULT_STATE } from './config';
export { TOOLS, getTool } from './tools';
export {
  newCanvas,
  saveCanvas,
  openImage,
  openFile,
  exportProject,
  importProject,
  renderComposite,
} from './services/fileService';
export { PROJECT_EXTENSION } from './persistence/projectFile';
export { setTranslator, applyLabels, type Translator } from './i18n';
export type { ResizeTarget } from './services/imageOps';
export { createAutosave, type Autosave } from './persistence/autosave';
export { acquireTabLock } from './persistence/tabLock';
export { captureDocument, applyDocument, type DocumentSnapshot } from './persistence/document';
export { HISTORY_LIMITS } from './config';

/**
 * 建立繪圖引擎（不依賴任何介面框架）。
 * 回傳的 app.stage 是畫布區的 DOM 元素，由介面層掛載到頁面上，
 * 掛載後再呼叫 startEngine(app)。
 */
export function createEngine(initial: Partial<AppState> = {}): App {
  const store = createStore<AppState>({ ...DEFAULT_STATE, ...initial });
  const pending = new Set<() => void>();

  const app = {
    store,
    tools: TOOLS,
    getTool: () => getTool(store.get('tool')) ?? TOOLS[0],
    isPinching: false,
    cancelStroke: () => {}, // 由 canvas/interaction 提供

    addPending: fn => {
      pending.add(fn);
    },
    finishPending: () => pending.forEach(fn => fn()),

    setTool(id) {
      app.finishPending();
      app.canvas.clearOverlay();
      if (!getTool(id)?.isSelection) app.selection.clear();
      store.set('tool', id);
    },
    swapColors() {
      const p = store.get('primary');
      store.set('primary', store.get('secondary'));
      store.set('secondary', p);
    },
    /** 剪下 / 複製：有選取物件時作用在物件，否則作用在選取範圍 */
    cut() {
      const id = app.objects.selectedId;
      if (id != null) app.objects.cut(id);
      else app.selection.cut();
    },
    copy() {
      const id = app.objects.selectedId;
      if (id != null) app.objects.copy(id);
      else app.selection.copy();
    },
  } as App;

  app.canvas = createCanvas(app);
  app.assets = createAssetStore();
  app.history = createHistory({
    canvas: app.canvas,
    objects: {
      serialize: () => app.objects.serialize(),
      load: list => app.objects.load(list),
    },
    finishPending: () => app.finishPending(),
    beforeApply: () => app.selection.clear(),
    onChange: s => {
      store.set('canUndo', s.canUndo);
      store.set('canRedo', s.canRedo);
      store.set('historyBytes', s.bytes);
      store.set('historyOverQuota', s.overQuota);
      store.set('revision', store.get('revision') + 1);
    },
    // 紀錄被丟棄後，回收不再被任何物件或紀錄引用的圖片
    onDiscard: () => app.assets.gc([...app.objects.assetIds(), ...app.history.referencedAssets()]),
  });
  app.canvas.holder.append(createResizeHandle(app));
  app.objects = createObjectLayer(app);
  app.selection = createSelection(app);
  app.image = createImageOps(app);

  const sizer = h('div', { class: 'canvas-sizer' }, app.canvas.holder);
  app.stage = h('div', { class: 'stage' }, sizer);
  app.zoom = createZoom(app, sizer);
  app.clipboard = createClipboard(app);

  // 點畫布外的灰色區域也會取消選取物件
  app.stage.addEventListener('pointerdown', e => {
    if (e.target === app.stage) app.finishPending();
  });

  TOOLS.forEach(t => t.init?.(app));
  return app;
}

/** app.stage 掛載到頁面後呼叫：設定初始畫布大小並綁定所有輸入事件 */
export function startEngine(app: App) {
  const { stage, store } = app;
  app.canvas.setSize(
    clamp(stage.clientWidth - 40, CANVAS_DEFAULT.minW, CANVAS_DEFAULT.maxW),
    clamp(stage.clientHeight - 40, CANVAS_DEFAULT.minH, CANVAS_DEFAULT.maxH),
    false,
  );

  // 游標樣式跟著工具
  const syncCursor = () => {
    app.canvas.canvas.style.cursor = app.getTool().cursor;
  };
  store.on('tool', syncCursor);
  syncCursor();

  bindInteraction(app);
  app.zoom.bind();
  bindShortcuts(app);
  bindFocusGuard();
  bindDropToOpen(app, stage);
}
