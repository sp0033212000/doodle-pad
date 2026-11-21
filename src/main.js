// 組裝入口：建立 app 物件，把各模組接起來
import './styles/base.css';
import './styles/toolbar.css';
import './styles/canvas.css';
import './styles/statusbar.css';

import { DEFAULT_STATE, CANVAS_DEFAULT } from './config.js';
import { createStore } from './core/store.js';
import { createHistory } from './core/history.js';
import { bindShortcuts } from './core/shortcuts.js';
import { createCanvas } from './canvas/canvasManager.js';
import { createResizeHandle } from './canvas/resizeHandle.js';
import { bindInteraction } from './canvas/interaction.js';
import { createObjectLayer } from './canvas/objectLayer.js';
import { createZoom } from './canvas/zoom.js';
import { createSelection } from './canvas/selection.js';
import { createImageOps } from './services/imageOps.js';
import { bindFocusGuard } from './core/focusGuard.js';
import './styles/dialog.css';
import { TOOLS, getTool } from './tools/index.js';
import { createClipboard } from './services/clipboard.js';
import { bindDropToOpen } from './services/fileService.js';
import { createToolbar } from './ui/toolbar/Toolbar.js';
import { createStatusBar } from './ui/StatusBar.js';
import { h, clamp } from './utils/dom.js';

const store = createStore(DEFAULT_STATE);
const pending = new Set();

/** 所有模組共用的 app 物件 */
const app = {
  store,
  tools: TOOLS,
  getTool: () => getTool(store.get('tool')),
  isPinching: false,
  cancelStroke: () => {},   // 由 canvas/interaction.js 提供

  /** 註冊「尚未完成的操作」（文字輸入、浮動貼上…），在其他動作前會先被確定 */
  addPending: fn => pending.add(fn),
  finishPending: () => pending.forEach(fn => fn()),

  setTool(id) {
    app.finishPending();
    app.canvas.clearOverlay();
    if (!getTool(id)?.isSelection) app.selection?.clear();
    store.set('tool', id);
  },

  /** 剪下 / 複製：有選取物件時作用在物件，否則作用在選取範圍 */
  cut() {
    if (app.objects.selectedId != null) app.objects.cut(app.objects.selectedId);
    else app.selection.cut();
  },
  copy() {
    if (app.objects.selectedId != null) app.objects.copy(app.objects.selectedId);
    else app.selection.copy();
  },
  swapColors() {
    const p = store.get('primary');
    store.set('primary', store.get('secondary'));
    store.set('secondary', p);
  },
};

app.canvas = createCanvas(app);
app.history = createHistory(app);
app.canvas.holder.append(createResizeHandle(app));
app.objects = createObjectLayer(app);
app.selection = createSelection(app);
app.image = createImageOps(app);
const sizer = h('div', { class: 'canvas-sizer' }, app.canvas.holder);
app.stage = h('div', { class: 'stage' }, sizer);
app.zoom = createZoom(app, sizer);
app.clipboard = createClipboard(app);

// 點畫布外的灰色區域也會取消選取物件
app.stage.addEventListener('pointerdown', e => { if (e.target === app.stage) app.finishPending(); });
TOOLS.forEach(t => t.init?.(app));

// 掛載畫面
document.getElementById('app').append(
  createToolbar(app),
  app.stage,
  createStatusBar(app),
);

// 依視窗大小決定初始畫布
app.canvas.setSize(
  clamp(app.stage.clientWidth - 40, CANVAS_DEFAULT.minW, CANVAS_DEFAULT.maxW),
  clamp(app.stage.clientHeight - 40, CANVAS_DEFAULT.minH, CANVAS_DEFAULT.maxH),
  false,
);

// 游標樣式跟著工具
const syncCursor = () => { app.canvas.canvas.style.cursor = app.getTool().cursor; };
store.on('tool', syncCursor);
syncCursor();

bindInteraction(app);
app.zoom.bind();
bindShortcuts(app);
bindFocusGuard();
bindDropToOpen(app, app.stage);
