import type { App, AppState, PixelBuffer } from '../types';
import type { HistoryEntry, ObjectState } from '../core/history';
import { createBuffer } from '../utils/pixels';
import { createCanvas2D } from '../utils/dom';

/**
 * 作品的序列化格式（自動保存與專案檔共用）。
 * 都是純資料（數字、字串、Uint8ClampedArray），可直接存進 IndexedDB。
 */

export const SETTINGS_KEYS = ['tool', 'size', 'primary', 'secondary', 'shapeMode'] as const;
export type Settings = Pick<AppState, (typeof SETTINGS_KEYS)[number]>;

export interface SerializedAsset {
  id: string;
  pixels: PixelBuffer;
}

export interface DocumentSnapshot {
  version: 1;
  canvas: PixelBuffer;
  objects: ObjectState[];
  settings: Settings;
  assets: SerializedAsset[];
  history: { undo: HistoryEntry[]; redo: HistoryEntry[] };
}

/** 轉成純資料的像素緩衝區（ImageData 在部分環境不能直接複製） */
const plain = (b: PixelBuffer): PixelBuffer => createBuffer(b.width, b.height, new Uint8ClampedArray(b.data));

export function serializeAsset(app: App, id: string): SerializedAsset {
  const { canvas, width, height } = app.assets.get(id);
  const pixels = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height);
  return { id, pixels: plain(pixels) };
}

/** 擷取目前作品；includeHistory=false 時不含復原紀錄 */
export function captureDocument(app: App, { includeHistory = true } = {}): DocumentSnapshot {
  const { width, height } = app.canvas;
  const history = includeHistory ? app.history.entries() : { undo: [], redo: [] };
  const objects = app.objects.serialize();

  // 需要保存的圖片：目前的物件 + 復原紀錄引用到的
  const assetIds = new Set(objects.map(o => o.assetId));
  if (includeHistory) app.history.referencedAssets().forEach(id => assetIds.add(id));

  return {
    version: 1,
    canvas: plain(app.canvas.getPixels(0, 0, width, height)),
    objects,
    settings: Object.fromEntries(SETTINGS_KEYS.map(k => [k, app.store.get(k)])) as Settings,
    assets: [...assetIds].filter(id => app.assets.has(id)).map(id => serializeAsset(app, id)),
    history,
  };
}

/** 把作品載入引擎（取代目前內容） */
export function applyDocument(app: App, doc: DocumentSnapshot) {
  app.finishPending();
  app.selection.clear();

  for (const a of doc.assets) {
    const { canvas, ctx } = createCanvas2D(a.pixels.width, a.pixels.height);
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(a.pixels.data), a.pixels.width, a.pixels.height),
      0,
      0,
    );
    app.assets.put({ id: a.id, width: a.pixels.width, height: a.pixels.height, canvas });
  }

  app.canvas.setSize(doc.canvas.width, doc.canvas.height, false);
  app.canvas.putPixels(doc.canvas, 0, 0);
  app.objects.load(doc.objects);
  app.objects.select(null);
  app.history.restore(doc.history);
  for (const k of SETTINGS_KEYS) {
    if (doc.settings[k] !== undefined) app.store.set(k, doc.settings[k] as never);
  }
}
