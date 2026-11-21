import type { App } from '../types';
import { hexToRgba } from '../utils/color';
import { clamp, createCanvas2D } from '../utils/dom';
import { CANVAS_MAX } from '../config';

export interface ResizeTarget {
  kind: 'object' | 'region' | 'image';
  label: string;
  w: number;
  h: number;
  apply(nw: number, nh: number): void;
}

/** 影像操作：裁切、調整大小 */
export function createImageOps(app: App) {
  /**
   * 裁切：把畫布裁成選取範圍的外框。
   * 套索 / 魔術棒選取時，範圍外的像素以次色填滿。
   * 未鎖定的物件會跟著位移，維持在畫面上相同的位置。
   */
  function crop() {
    const region = app.selection.region;
    if (!region) return;
    const { x, y, w, h, mask } = region;
    const c = app.canvas;

    app.finishPending();
    app.history.push();

    const img = c.ctx.getImageData(x, y, w, h);
    const [r, g, b] = hexToRgba(app.store.get('secondary'));
    for (let k = 0; k < mask.length; k++) {
      if (mask[k]) continue;
      const i = k * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
    c.setSize(w, h, false); // 會一併清除選取範圍
    c.ctx.putImageData(img, 0, 0);
    app.objects.transformAll({ dx: -x, dy: -y });
  }

  /** 縮放整張圖片（畫布內容 + 所有物件） */
  function resizeCanvas(nw: number, nh: number) {
    const c = app.canvas;
    const ow = c.width,
      oh = c.height;
    if (nw === ow && nh === oh) return;

    app.finishPending();
    app.history.push();

    const copy = createCanvas2D(ow, oh);
    copy.ctx.drawImage(c.canvas, 0, 0);
    c.setSize(nw, nh, false);
    c.ctx.imageSmoothingEnabled = true;
    c.ctx.imageSmoothingQuality = 'high';
    c.ctx.drawImage(copy.canvas, 0, 0, nw, nh);
    app.objects.transformAll({ sx: nw / ow, sy: nh / oh });
  }

  /** 「調整大小」作用的對象：選取中的物件 → 選取範圍 → 整張圖片 */
  function resizeTarget(): ResizeTarget {
    const id = app.objects.selectedId;
    const rect = id != null ? app.objects.getRect(id) : null;
    if (id != null && rect) {
      return {
        kind: 'object',
        label: '選取的物件',
        w: rect.w,
        h: rect.h,
        apply(nw, nh) {
          if (nw === rect.w && nh === rect.h) return;
          app.history.push();
          app.objects.setRect(id, { w: nw, h: nh });
        },
      };
    }
    const region = app.selection.region;
    if (region) {
      return {
        kind: 'region',
        label: '選取範圍',
        w: region.w,
        h: region.h,
        apply(nw, nh) {
          // 挖出成為物件後再縮放，結果仍可移動、調整，最後再鎖定
          const objId = app.selection.lift();
          if (objId != null) app.objects.setRect(objId, { w: nw, h: nh });
        },
      };
    }
    return {
      kind: 'image',
      label: '整張圖片',
      w: app.canvas.width,
      h: app.canvas.height,
      apply: resizeCanvas,
    };
  }

  const clampSize = (v: number) => clamp(Math.round(v), 1, CANVAS_MAX);

  return { crop, resizeCanvas, resizeTarget, clampSize };
}

export type ImageOps = ReturnType<typeof createImageOps>;
