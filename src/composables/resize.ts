/** 調整大小對話框的換算邏輯（純函式，可單元測試） */

export type ResizeUnit = 'percent' | 'pixel';

export interface ResizeInput {
  unit: ResizeUnit;
  w: number;
  h: number;
  /** 原始尺寸 */
  ow: number;
  oh: number;
}

/** 依輸入值算出新的像素尺寸（未限制範圍） */
export function toPixels({ unit, w, h, ow, oh }: ResizeInput) {
  return unit === 'percent' ? { nw: (ow * w) / 100, nh: (oh * h) / 100 } : { nw: w, nh: h };
}

/** 維持長寬比：修改一邊時，算出另一邊的值 */
export function linkedValue(unit: ResizeUnit, value: number, ow: number, oh: number, changed: 'w' | 'h') {
  if (unit === 'percent') return value;
  return changed === 'w' ? Math.round((value * oh) / ow) : Math.round((value * ow) / oh);
}

/** 切換單位時，把目前結果換算成新單位的輸入值 */
export function convertUnit(next: ResizeUnit, nw: number, nh: number, ow: number, oh: number) {
  return next === 'percent'
    ? { w: Math.round((nw / ow) * 100), h: Math.round((nh / oh) * 100) }
    : { w: nw, h: nh };
}
