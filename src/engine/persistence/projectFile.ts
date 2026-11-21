import type { PixelBuffer } from '../types';
import type { CanvasChange, HistoryEntry } from '../core/history';
import type { DocumentSnapshot } from './document';
import { createCanvas2D } from '../utils/dom';
import { createBuffer } from '../utils/pixels';

/**
 * `.doodle` 專案檔：單一 JSON，圖片以 base64 PNG 內嵌。
 * 保留畫布、未鎖定的物件、圖片庫、工具設定，以及（可選的）復原紀錄。
 */

export const PROJECT_FORMAT = 'doodle-pad';
export const PROJECT_VERSION = 1;
export const PROJECT_EXTENSION = '.doodle';

/** 圖片編碼方式（預設 PNG data URL；測試時可替換） */
export interface PixelCodec {
  encode(buf: PixelBuffer): string;
  decode(data: string, width: number, height: number): Promise<PixelBuffer>;
}

interface EncodedImage {
  width: number;
  height: number;
  data: string;
}

type EncodedChange =
  | { kind: 'patch'; x: number; y: number; before: EncodedImage; after: EncodedImage }
  | { kind: 'full'; before: EncodedImage; after: EncodedImage };

interface EncodedEntry extends Omit<HistoryEntry, 'canvas'> {
  canvas: EncodedChange | null;
}

export interface ProjectFile {
  format: typeof PROJECT_FORMAT;
  version: number;
  createdAt: string;
  canvas: EncodedImage;
  objects: DocumentSnapshot['objects'];
  settings: DocumentSnapshot['settings'];
  assets: (EncodedImage & { id: string })[];
  history: { undo: EncodedEntry[]; redo: EncodedEntry[] } | null;
}

export class ProjectFileError extends Error {}

/** 預設編碼：PNG data URL（無損） */
export const pngCodec: PixelCodec = {
  encode(buf) {
    const { canvas, ctx } = createCanvas2D(buf.width, buf.height);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.width, buf.height), 0, 0);
    return canvas.toDataURL('image/png');
  },
  decode(data, width, height) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { ctx } = createCanvas2D(width, height);
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, width, height);
        resolve(createBuffer(width, height, d.data));
      };
      img.onerror = () => reject(new ProjectFileError('invalid image data'));
      img.src = data;
    });
  },
};

const encodeImage = (buf: PixelBuffer, codec: PixelCodec): EncodedImage => ({
  width: buf.width,
  height: buf.height,
  data: codec.encode(buf),
});

const decodeImage = (img: EncodedImage, codec: PixelCodec) => codec.decode(img.data, img.width, img.height);

function encodeChange(c: CanvasChange, codec: PixelCodec): EncodedChange {
  const before = encodeImage(c.before, codec);
  const after = encodeImage(c.after, codec);
  return c.kind === 'patch'
    ? { kind: 'patch', x: c.x, y: c.y, before, after }
    : { kind: 'full', before, after };
}

async function decodeChange(c: EncodedChange, codec: PixelCodec): Promise<CanvasChange> {
  const [before, after] = await Promise.all([decodeImage(c.before, codec), decodeImage(c.after, codec)]);
  return c.kind === 'patch'
    ? { kind: 'patch', x: c.x, y: c.y, before, after }
    : { kind: 'full', before, after };
}

const encodeEntry = (e: HistoryEntry, codec: PixelCodec): EncodedEntry => ({
  ...e,
  canvas: e.canvas && encodeChange(e.canvas, codec),
});

const decodeEntry = async (e: EncodedEntry, codec: PixelCodec): Promise<HistoryEntry> => ({
  ...e,
  canvas: e.canvas && (await decodeChange(e.canvas, codec)),
});

/** 作品 → 專案檔資料 */
export function encodeProject(
  doc: DocumentSnapshot,
  { includeHistory, codec = pngCodec }: { includeHistory: boolean; codec?: PixelCodec },
): ProjectFile {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    createdAt: new Date().toISOString(),
    canvas: encodeImage(doc.canvas, codec),
    objects: doc.objects,
    settings: doc.settings,
    assets: doc.assets.map(a => ({ id: a.id, ...encodeImage(a.pixels, codec) })),
    history: includeHistory
      ? {
          undo: doc.history.undo.map(e => encodeEntry(e, codec)),
          redo: doc.history.redo.map(e => encodeEntry(e, codec)),
        }
      : null,
  };
}

/** 專案檔資料 → 作品；格式不正確時丟出 ProjectFileError */
export async function decodeProject(raw: unknown, codec: PixelCodec = pngCodec): Promise<DocumentSnapshot> {
  const file = raw as Partial<ProjectFile> | null;
  if (!file || typeof file !== 'object' || file.format !== PROJECT_FORMAT) {
    throw new ProjectFileError('not a doodle-pad project');
  }
  if (typeof file.version !== 'number' || file.version > PROJECT_VERSION) {
    throw new ProjectFileError(`unsupported version: ${file.version}`);
  }
  if (!file.canvas || !Array.isArray(file.objects) || !Array.isArray(file.assets)) {
    throw new ProjectFileError('missing fields');
  }

  const [canvas, assets, undo, redo] = await Promise.all([
    decodeImage(file.canvas, codec),
    Promise.all(file.assets.map(async a => ({ id: a.id, pixels: await decodeImage(a, codec) }))),
    Promise.all((file.history?.undo ?? []).map(e => decodeEntry(e, codec))),
    Promise.all((file.history?.redo ?? []).map(e => decodeEntry(e, codec))),
  ]);

  return {
    version: 1,
    canvas,
    objects: file.objects,
    settings: file.settings ?? ({} as DocumentSnapshot['settings']),
    assets,
    history: { undo, redo },
  };
}
