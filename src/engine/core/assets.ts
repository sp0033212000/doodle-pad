import type { SizedImageSource } from '../types';
import { hashPixels } from '../utils/hash';

export interface Asset {
  id: string;
  width: number;
  height: number;
  /** 不可變的圖片內容 */
  canvas: HTMLCanvasElement;
}

/**
 * 圖片庫：貼上過的每張圖片只存一份。
 *  - id 由像素內容計算，相同內容 → 相同 id（自動去重複）
 *  - gc(refs)：刪除不再被物件或復原紀錄引用的圖片
 */
export function createAssetStore() {
  const assets = new Map<string, Asset>();

  return {
    /** 加入圖片，回傳 id（已存在則直接回傳既有 id） */
    add(source: SizedImageSource): string {
      const width = source.width;
      const height = source.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0);
      const id = hashPixels(ctx.getImageData(0, 0, width, height).data, width, height);
      if (!assets.has(id)) assets.set(id, { id, width, height, canvas });
      return id;
    },

    /** 以已知 id 加入（自動保存還原時使用） */
    put(asset: Asset) {
      assets.set(asset.id, asset);
    },

    get(id: string): Asset {
      const a = assets.get(id);
      if (!a) throw new Error(`asset not found: ${id}`);
      return a;
    },

    has: (id: string) => assets.has(id),

    gc(refs: Iterable<string>) {
      const keep = new Set(refs);
      for (const id of assets.keys()) if (!keep.has(id)) assets.delete(id);
    },

    ids: () => [...assets.keys()],
    get size() {
      return assets.size;
    },
  };
}

export type AssetStore = ReturnType<typeof createAssetStore>;
