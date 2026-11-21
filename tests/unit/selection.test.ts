import { describe, it, expect } from 'vitest';
import {
  rectRegion,
  regionFromFullMask,
  regionContains,
  regionOutline,
} from '../../src/engine/canvas/selectionMask';
import { constrain } from '../../src/engine/tools/shapes';
import { keyOf } from '../../src/engine/utils/keys';
import { createStore } from '../../src/engine/core/store';

describe('選取遮罩', () => {
  it('矩形選取會被裁在畫布範圍內', () => {
    const r = rectRegion({ x: -10, y: 5 }, { x: 30, y: 200 }, { w: 20, h: 50 })!;
    expect({ x: r.x, y: r.y, w: r.w, h: r.h }).toEqual({ x: 0, y: 5, w: 20, h: 45 });
  });

  it('零面積的選取回傳 null', () => {
    expect(rectRegion({ x: 3, y: 3 }, { x: 3, y: 9 }, { w: 20, h: 20 })).toBeNull();
  });

  it('由整張遮罩裁出外框', () => {
    const full = new Uint8Array(6 * 4);
    full[1 * 6 + 2] = 1;
    full[2 * 6 + 4] = 1;
    const r = regionFromFullMask(full, 6)!;
    expect({ x: r.x, y: r.y, w: r.w, h: r.h }).toEqual({ x: 2, y: 1, w: 3, h: 2 });
    expect(regionContains(r, { x: 2, y: 1 })).toBe(true);
    expect(regionContains(r, { x: 3, y: 1 })).toBe(false);
  });

  it('矩形的外框只有 4 條合併後的邊', () => {
    const r = rectRegion({ x: 0, y: 0 }, { x: 5, y: 3 }, { w: 10, h: 10 })!;
    expect(regionOutline(r)).toHaveLength(4);
  });
});

describe('圖形限制（Shift）', () => {
  it('直線鎖定在 45° 倍數', () => {
    expect(constrain('line', { x: 0, y: 0 }, { x: 10, y: 1 })).toEqual({ x: 10, y: 0 });
  });
  it('矩形鎖定為正方形', () => {
    expect(constrain('rect', { x: 0, y: 0 }, { x: 10, y: -4 })).toEqual({ x: 10, y: -10 });
  });
});

describe('keyOf（輸入法無關）', () => {
  it('以實體按鍵判斷', () => {
    expect(keyOf({ key: 'ㄈ', code: 'KeyZ' })).toBe('z');
    expect(keyOf({ key: '=', code: 'Equal' })).toBe('=');
    expect(keyOf({ key: 'Enter', code: 'Enter' })).toBe('enter');
  });
});

describe('store', () => {
  it('set 會通知訂閱者，相同值不通知，可取消訂閱', () => {
    const store = createStore({ size: 1 });
    const seen: number[] = [];
    const off = store.on('size', v => seen.push(v));
    store.set('size', 2);
    store.set('size', 2);
    off();
    store.set('size', 3);
    expect(seen).toEqual([2]);
    expect(store.get('size')).toBe(3);
  });
});
