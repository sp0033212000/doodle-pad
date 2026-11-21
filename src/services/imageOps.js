import { hexToRgba } from '../utils/color.js';
import { h, clamp } from '../utils/dom.js';
import { CANVAS_MIN, CANVAS_MAX } from '../config.js';

/**
 * 影像操作：裁切、調整大小。
 */
export function createImageOps(app) {
  /**
   * 裁切：把畫布裁成選取範圍的外框。
   * 套索 / 魔術棒選取時，範圍外的像素以次色填滿。
   * 未鎖定的物件會跟著位移，維持在畫面上相同的位置。
   */
  function crop() {
    const region = app.selection.region;
    if (!region) return;
    const { x, y, w, h: hh, mask } = region;
    const c = app.canvas;

    app.finishPending();
    app.history.push();

    const img = c.ctx.getImageData(x, y, w, hh);
    const [r, g, b] = hexToRgba(app.store.get('secondary'));
    for (let k = 0; k < mask.length; k++) {
      if (mask[k]) continue;
      const i = k * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    c.setSize(w, hh, false);   // 會一併清除選取範圍
    c.ctx.putImageData(img, 0, 0);
    app.objects.transformAll({ dx: -x, dy: -y });
  }

  /** 縮放整張圖片（畫布內容 + 所有物件） */
  function resizeCanvas(nw, nh) {
    const c = app.canvas;
    const ow = c.width, oh = c.height;
    if (nw === ow && nh === oh) return;

    app.finishPending();
    app.history.push();

    const copy = h('canvas', { width: ow, height: oh });
    copy.getContext('2d').drawImage(c.canvas, 0, 0);
    c.setSize(nw, nh, false);
    c.ctx.imageSmoothingEnabled = true;
    c.ctx.imageSmoothingQuality = 'high';
    c.ctx.drawImage(copy, 0, 0, nw, nh);
    app.objects.transformAll({ sx: nw / ow, sy: nh / oh });
  }

  /**
   * 目前「調整大小」作用的對象：
   *  選取中的物件 → 選取範圍 → 整張圖片
   * 回傳 { label, w, h, apply(nw, nh) }
   */
  function resizeTarget() {
    const id = app.objects.selectedId;
    if (id != null) {
      const r = app.objects.getRect(id);
      return {
        label: '選取的物件', w: r.w, h: r.h,
        apply(nw, nh) {
          if (nw === r.w && nh === r.h) return;
          app.history.push();
          app.objects.setRect(id, { w: nw, h: nh });
        },
      };
    }
    const region = app.selection.region;
    if (region) {
      return {
        label: '選取範圍', w: region.w, h: region.h,
        apply(nw, nh) {
          // 挖出成為物件後再縮放，結果仍可移動、調整，最後再鎖定
          const objId = app.selection.lift();
          app.objects.setRect(objId, { w: nw, h: nh });
        },
      };
    }
    return {
      label: '整張圖片', w: app.canvas.width, h: app.canvas.height,
      apply: resizeCanvas,
    };
  }

  const clampSize = v => clamp(Math.round(v), 1, CANVAS_MAX);

  return { crop, resizeCanvas, resizeTarget, clampSize, CANVAS_MIN };
}
