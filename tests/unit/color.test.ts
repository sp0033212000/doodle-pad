import { describe, it, expect } from 'vitest';
import {
  parseHex,
  rgbToHex,
  normalizeHex,
  alphaOf,
  opaque,
  withAlpha,
  rgbToHsv,
  hsvToRgb,
} from '../../src/engine/utils/color';
import { fillMask } from '../../src/engine/utils/floodFill';
import { createBuffer } from '../../src/engine/utils/pixels';

describe('顏色解析與格式', () => {
  it('支援 #rgb、#rrggbb、#rrggbbaa，格式錯誤回傳 null', () => {
    expect(parseHex('#f00')).toEqual([255, 0, 0, 255]);
    expect(parseHex('3f48cc')).toEqual([63, 72, 204, 255]);
    expect(parseHex('#ff000080')).toEqual([255, 0, 0, 128]);
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('red')).toBeNull();
  });

  it('不透明時省略 alpha，並統一成小寫', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(255, 0, 0, 128)).toBe('#ff000080');
    expect(normalizeHex('#FF0000FF')).toBe('#ff0000');
  });

  it('透明度工具', () => {
    expect(alphaOf('#ff000080')).toBeCloseTo(0.5, 1);
    expect(opaque('#ff000080')).toBe('#ff0000');
    expect(withAlpha('#00ff00', 0.25)).toBe('#00ff0040');
  });
});

describe('HSV 轉換', () => {
  it('來回轉換不失真', () => {
    for (const c of [
      [255, 0, 0],
      [63, 72, 204],
      [0, 0, 0],
      [255, 255, 255],
      [12, 200, 99],
    ] as [number, number, number][]) {
      expect(hsvToRgb(rgbToHsv(...c))).toEqual(c);
    }
  });

  it('純色的色相', () => {
    expect(rgbToHsv(0, 255, 0).h).toBe(120);
    expect(rgbToHsv(0, 0, 255).h).toBe(240);
  });
});

describe('半透明填色', () => {
  it('與原本的像素混色，而不是變成半透明', () => {
    const img = createBuffer(1, 1, new Uint8ClampedArray([255, 255, 255, 255]));
    fillMask(img, new Uint8Array([1]), '#ff000080');
    const [r, g, b, a] = img.data;
    expect([r, a]).toEqual([255, 255]);
    expect(g).toBeGreaterThanOrEqual(126);
    expect(g).toBeLessThanOrEqual(128);
    expect(b).toBe(g);
  });
});
