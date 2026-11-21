import { describe, it, expect } from 'vitest';
import { createBuffer, cropBuffer, pasteBuffer, diffBounds } from '../../src/engine/utils/pixels';
import { hashPixels } from '../../src/engine/utils/hash';
import { floodRegion, fillMask } from '../../src/engine/utils/floodFill';

const set = (b: ReturnType<typeof createBuffer>, x: number, y: number, v: number) => {
  const i = (y * b.width + x) * 4;
  b.data[i] = b.data[i + 1] = b.data[i + 2] = v;
  b.data[i + 3] = 255;
};

describe('pixels', () => {
  it('diffBounds 找出變化的外框', () => {
    const a = createBuffer(20, 10);
    const b = createBuffer(20, 10);
    expect(diffBounds(a, b)).toBeNull();
    set(b, 3, 2, 9);
    set(b, 7, 5, 9);
    expect(diffBounds(a, b)).toEqual({ x: 3, y: 2, w: 5, h: 4 });
  });

  it('crop 與 paste 互為逆操作', () => {
    const a = createBuffer(10, 10);
    set(a, 4, 4, 50);
    const piece = cropBuffer(a, 3, 3, 3, 3);
    const b = createBuffer(10, 10);
    pasteBuffer(b, piece, 3, 3);
    expect(diffBounds(a, b)).toBeNull();
  });
});

describe('hashPixels', () => {
  it('相同內容得到相同 id，不同內容得到不同 id', () => {
    const a = createBuffer(8, 8);
    const b = createBuffer(8, 8);
    expect(hashPixels(a.data, 8, 8)).toBe(hashPixels(b.data, 8, 8));
    set(b, 1, 1, 1);
    expect(hashPixels(a.data, 8, 8)).not.toBe(hashPixels(b.data, 8, 8));
  });

  it('尺寸不同時 id 不同', () => {
    const a = createBuffer(4, 8);
    const b = createBuffer(8, 4);
    expect(hashPixels(a.data, 4, 8)).not.toBe(hashPixels(b.data, 8, 4));
  });
});

describe('floodRegion', () => {
  it('被牆擋住的區域不會被填到', () => {
    const img = createBuffer(5, 3);
    img.data.fill(255);
    for (let y = 0; y < 3; y++) set(img, 2, y, 0); // 中間一道黑牆
    const mask = floodRegion(img, 0, 0)!;
    expect(mask.reduce((n, v) => n + v, 0)).toBe(6); // 左邊 2×3
    expect(mask[4]).toBe(0);
  });

  it('起點超出範圍回傳 null', () => {
    expect(floodRegion(createBuffer(2, 2), 5, 5)).toBeNull();
  });

  it('fillMask 依遮罩填色', () => {
    const img = createBuffer(2, 1);
    fillMask(img, new Uint8Array([1, 0]), '#ff0000');
    expect(Array.from(img.data)).toEqual([255, 0, 0, 255, 0, 0, 0, 0]);
  });
});
