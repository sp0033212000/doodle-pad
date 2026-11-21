import { describe, it, expect } from 'vitest';
import { convertUnit, linkedValue, toPixels } from '../../src/composables/resize';

describe('調整大小換算', () => {
  it('百分比轉像素', () => {
    expect(toPixels({ unit: 'percent', w: 50, h: 200, ow: 600, oh: 400 })).toEqual({ nw: 300, nh: 800 });
  });

  it('像素模式直接使用輸入值', () => {
    expect(toPixels({ unit: 'pixel', w: 123, h: 45, ow: 600, oh: 400 })).toEqual({ nw: 123, nh: 45 });
  });

  it('維持長寬比：像素模式依比例換算另一邊', () => {
    expect(linkedValue('pixel', 200, 100, 80, 'w')).toBe(160);
    expect(linkedValue('pixel', 160, 100, 80, 'h')).toBe(200);
  });

  it('維持長寬比：百分比模式兩邊相同', () => {
    expect(linkedValue('percent', 75, 100, 80, 'w')).toBe(75);
  });

  it('切換單位時換算輸入值', () => {
    expect(convertUnit('percent', 300, 200, 600, 400)).toEqual({ w: 50, h: 50 });
    expect(convertUnit('pixel', 300, 200, 600, 400)).toEqual({ w: 300, h: 200 });
  });
});
