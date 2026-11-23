import type { AppState, ShapeMode } from './types';

// 全域設定與常數

export const PALETTE = [
  '#000000',
  '#7f7f7f',
  '#880015',
  '#ed1c24',
  '#ff7f27',
  '#fff200',
  '#22b14c',
  '#00a2e8',
  '#3f48cc',
  '#a349a4',
  '#8b4513',
  '#ff69b4',
  '#40e0d0',
  '#006400',
  '#ffffff',
  '#c3c3c3',
  '#b97a57',
  '#ffaec9',
  '#ffc90e',
  '#efe4b0',
  '#b5e61d',
  '#99d9ea',
  '#7092be',
  '#c8bfe7',
  '#d2b48c',
  '#ffe4e1',
  '#e0ffff',
  '#90ee90',
] as const;

export const SHAPE_MODES: ShapeMode[] = ['stroke', 'fill', 'both'];

export const SIZE_RANGE = { min: 1, max: 60 } as const;
export const FILL_TOLERANCE = 32;
export const CANVAS_MIN = 50;
export const CANVAS_MAX = 8000;
export const CANVAS_DEFAULT = { minW: 400, maxW: 1000, minH: 300, maxH: 620 } as const;
export const ZOOM_RANGE = { min: 0.1, max: 64 } as const;
export const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64] as const;

/** 放大鏡倍率（1 個畫布像素 = 幾個螢幕像素） */
export const MAGNIFY_RANGE = { min: 2, max: 64 } as const;

/** 文字工具可選的字型（代號 → CSS font-family）；default 沿用介面字型 */
export const TEXT_FONTS: Record<string, string> = {
  default: '',
  sans: 'Arial, "Helvetica Neue", "PingFang TC", "Microsoft JhengHei", sans-serif',
  serif: 'Georgia, "Times New Roman", "Songti TC", PMingLiU, serif',
  mono: '"Courier New", Menlo, Consolas, monospace',
  hand: '"Comic Sans MS", "Chalkboard SE", "Kaiti TC", cursive',
  kai: 'BiauKai, "Kaiti TC", DFKai-SB, "標楷體", serif',
};

export const TEXT_SIZE_RANGE = { min: 8, max: 200 } as const;

/** 放大到這個倍率以上顯示像素格線 */
export const PIXEL_GRID_MIN_ZOOM = 4;

/** 復原紀錄上限 */
export const HISTORY_LIMITS = {
  maxSteps: 100,
  maxBytes: 200 * 1024 * 1024,
} as const;

/** store 的初始狀態 */
export const DEFAULT_STATE: AppState = {
  tool: 'pencil',
  size: 3,
  primary: '#000000',
  secondary: '#ffffff',
  shapeMode: 'stroke',
  cursorPos: null,
  canvasSize: { w: 0, h: 0 },
  canUndo: false,
  canRedo: false,
  historyBytes: 0,
  historyOverQuota: false,
  zoom: 1,
  magnify: 8,
  textStyle: {
    font: 'default',
    size: 24,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    align: 'left',
    fill: false,
  },
  hasSelection: false,
  hasRegion: false,
  canPasteInternal: false,
  revision: 0,
  readOnly: false,
  penOnly: false,
  penOnlyAuto: true,
  penDetected: false,
  useSecondary: false,
};
