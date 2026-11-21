// 全域設定與常數

export const PALETTE = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c',
  '#00a2e8', '#3f48cc', '#a349a4', '#8b4513', '#ff69b4', '#40e0d0', '#006400',
  '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d',
  '#99d9ea', '#7092be', '#c8bfe7', '#d2b48c', '#ffe4e1', '#e0ffff', '#90ee90',
];

export const SHAPE_MODES = [
  { value: 'stroke', label: '外框' },
  { value: 'fill', label: '填滿' },
  { value: 'both', label: '外框+填滿' },
];

export const SIZE_RANGE = { min: 1, max: 60 };
export const MAX_HISTORY = 50;
export const FILL_TOLERANCE = 32;
export const CANVAS_MIN = 50;
export const CANVAS_MAX = 8000;
export const ZOOM_RANGE = { min: 0.1, max: 8 };
export const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
export const CANVAS_DEFAULT = { minW: 400, maxW: 1000, minH: 300, maxH: 620 };

/** store 的初始狀態 */
export const DEFAULT_STATE = {
  tool: 'pencil',
  size: 3,
  primary: '#000000',
  secondary: '#ffffff',
  shapeMode: 'stroke',
  cursorPos: null,           // {x, y} | null
  canvasSize: { w: 0, h: 0 },
  canUndo: false,
  canRedo: false,
  zoom: 1,                   // 畫布檢視縮放倍率
  hasSelection: false,       // 是否有選取中的貼上物件
  hasRegion: false,          // 是否有選取範圍（矩形 / 套索 / 魔術棒）
  canPasteInternal: false,   // 內部剪貼簿是否有物件
};
