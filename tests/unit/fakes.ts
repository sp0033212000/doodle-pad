import type { CanvasPort, ObjectState, ObjectsPort } from '../../src/engine/core/history';
import type { PixelBuffer } from '../../src/engine/types';
import { createBuffer, cropBuffer, pasteBuffer } from '../../src/engine/utils/pixels';

/** 純記憶體的畫布，實作 CanvasPort，供單元測試使用 */
export function fakeCanvas(width: number, height: number) {
  const white = (w: number, h: number) => {
    const b = createBuffer(w, h);
    b.data.fill(255);
    return b;
  };
  let buf: PixelBuffer = white(width, height);

  const port = {
    get width() {
      return buf.width;
    },
    get height() {
      return buf.height;
    },
    getPixels: (x: number, y: number, w: number, h: number) => cropBuffer(buf, x, y, w, h),
    putPixels: (b: PixelBuffer, x: number, y: number) => pasteBuffer(buf, b, x, y),
    setSize(w: number, h: number, keep = true) {
      const next = white(w, h);
      if (keep)
        pasteBuffer(next, cropBuffer(buf, 0, 0, Math.min(w, buf.width), Math.min(h, buf.height)), 0, 0);
      buf = next;
    },
    /** 測試輔助：把 (x, y) 設成某個灰階值 */
    paint(x: number, y: number, v = 0) {
      const i = (y * buf.width + x) * 4;
      buf.data[i] = buf.data[i + 1] = buf.data[i + 2] = v;
    },
    px: (x: number, y: number) => buf.data[(y * buf.width + x) * 4],
  };
  return port satisfies CanvasPort;
}

/** 純記憶體的物件清單，實作 ObjectsPort */
export function fakeObjects(initial: ObjectState[] = []) {
  let list = initial.map(o => ({ ...o }));
  const port = {
    serialize: () => list.map(o => ({ ...o })),
    load: (next: ObjectState[]) => {
      list = next.map(o => ({ ...o }));
    },
    get list() {
      return list;
    },
    add(o: ObjectState) {
      list.push({ ...o });
    },
    move(id: number, x: number, y: number) {
      const o = list.find(v => v.id === id)!;
      o.x = x;
      o.y = y;
    },
    remove(id: number) {
      list = list.filter(o => o.id !== id);
    },
  };
  return port satisfies ObjectsPort;
}
