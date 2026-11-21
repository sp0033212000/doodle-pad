import type { PixelBuffer } from '../types';
import { HISTORY_LIMITS } from '../config';
import { bufferBytes, cropBuffer, diffBounds } from '../utils/pixels';

/**
 * 復原 / 重做紀錄（操作紀錄式）。
 *
 * 不再每步存整張畫布，而是記錄「這一步改了什麼」：
 *  - 畫布：只存被改到的那塊區域「改之前 / 改之後」的像素（patch）；
 *          畫布尺寸改變（裁切、調整大小、擴大）時才存整張的前後狀態（full）。
 *  - 物件：每個物件的「改之前 / 改之後」狀態（位置、大小、引用的圖片 id）。
 *          圖片本身存在圖片庫（AssetStore），紀錄只引用 id。
 *
 * 用法：在修改「之前」呼叫 push()，接著直接修改畫布 / 物件。
 *  - 一般操作：同一個事件處理結束後自動完成這一步（與修改前的快照比對）。
 *  - 跨多個事件的操作（拖曳筆畫、移動物件）：用 beginGroup() / endGroup() 包起來，
 *    期間所有 push() 合併成同一步，放開時才完成。
 */

export interface ObjectState {
  id: number;
  assetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 可被紀錄的畫布介面（測試時可用純資料實作） */
export interface CanvasPort {
  readonly width: number;
  readonly height: number;
  getPixels(x: number, y: number, w: number, h: number): PixelBuffer;
  putPixels(buf: PixelBuffer, x: number, y: number): void;
  /** keep=false 時清成白色 */
  setSize(w: number, h: number, keep?: boolean): void;
}

export interface ObjectsPort {
  serialize(): ObjectState[];
  load(list: ObjectState[]): void;
}

export type CanvasChange =
  | { kind: 'patch'; x: number; y: number; before: PixelBuffer; after: PixelBuffer }
  | { kind: 'full'; before: PixelBuffer; after: PixelBuffer };

type IndexedState = ObjectState & { index: number };

export interface ObjectChange {
  id: number;
  before: IndexedState | null;
  after: IndexedState | null;
}

export interface HistoryEntry {
  canvas: CanvasChange | null;
  objects: ObjectChange[];
  bytes: number;
}

export interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  bytes: number;
  overQuota: boolean;
}

export interface HistoryOptions {
  canvas: CanvasPort;
  objects: ObjectsPort;
  maxSteps?: number;
  maxBytes?: number;
  /** undo / redo 前先確定進行中的操作（文字輸入等） */
  finishPending?: () => void;
  /** 套用紀錄前呼叫（例如清除選取範圍） */
  beforeApply?: () => void;
  onChange?: (status: HistoryStatus) => void;
  /** 有紀錄被丟棄時呼叫（可回收不再被引用的圖片） */
  onDiscard?: () => void;
}

interface Pending {
  pixels: PixelBuffer;
  objects: ObjectState[];
}

const sameState = (a: ObjectState, b: ObjectState) =>
  a.assetId === b.assetId && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** 比對兩份物件清單，找出每個物件的變化 */
export function diffObjects(before: ObjectState[], after: ObjectState[]): ObjectChange[] {
  const b = new Map(before.map((o, index) => [o.id, { ...o, index }]));
  const a = new Map(after.map((o, index) => [o.id, { ...o, index }]));
  const changes: ObjectChange[] = [];
  for (const id of new Set([...b.keys(), ...a.keys()])) {
    const ob = b.get(id) ?? null;
    const oa = a.get(id) ?? null;
    if (ob && oa && sameState(ob, oa)) continue;
    changes.push({ id, before: ob, after: oa });
  }
  return changes;
}

/** 對物件清單套用變化（direction = 要還原到的那一側） */
export function applyObjectChanges(
  list: ObjectState[],
  changes: ObjectChange[],
  side: 'before' | 'after',
): ObjectState[] {
  const result = list.filter(o => !changes.some(c => c.id === o.id));
  const inserts = changes
    .map(c => c[side])
    .filter((s): s is IndexedState => s !== null)
    .sort((x, y) => x.index - y.index);
  for (const { index, ...state } of inserts) {
    result.splice(Math.min(index, result.length), 0, state);
  }
  return result;
}

export function createHistory(opts: HistoryOptions) {
  const { canvas, objects } = opts;
  const maxSteps = opts.maxSteps ?? HISTORY_LIMITS.maxSteps;
  const maxBytes = opts.maxBytes ?? HISTORY_LIMITS.maxBytes;

  let undoStack: HistoryEntry[] = [];
  let redoStack: HistoryEntry[] = [];
  let pending: Pending | null = null;
  let groupDepth = 0;

  const fullPixels = () => canvas.getPixels(0, 0, canvas.width, canvas.height);
  const totalBytes = () =>
    undoStack.reduce((n, e) => n + e.bytes, 0) + redoStack.reduce((n, e) => n + e.bytes, 0);

  function notify() {
    const bytes = totalBytes();
    opts.onChange?.({
      canUndo: undoStack.length > 0 || pending !== null,
      canRedo: redoStack.length > 0,
      bytes,
      overQuota: bytes > maxBytes,
    });
  }

  /** 把進行中的快照與目前狀態比對，產生一筆紀錄 */
  function buildEntry(p: Pending): HistoryEntry | null {
    const before = p.pixels;
    let change: CanvasChange | null = null;

    if (before.width !== canvas.width || before.height !== canvas.height) {
      change = { kind: 'full', before, after: fullPixels() };
    } else {
      const after = fullPixels();
      const r = diffBounds(before, after);
      if (r) {
        change = {
          kind: 'patch',
          x: r.x,
          y: r.y,
          before: cropBuffer(before, r.x, r.y, r.w, r.h),
          after: cropBuffer(after, r.x, r.y, r.w, r.h),
        };
      }
    }

    const objectChanges = diffObjects(p.objects, objects.serialize());
    if (!change && objectChanges.length === 0) return null;
    const bytes = change ? bufferBytes(change.before) + bufferBytes(change.after) : 0;
    return { canvas: change, objects: objectChanges, bytes: bytes + objectChanges.length * 64 };
  }

  function apply(entry: HistoryEntry, side: 'before' | 'after') {
    opts.beforeApply?.();
    const c = entry.canvas;
    if (c?.kind === 'full') {
      const buf = c[side];
      canvas.setSize(buf.width, buf.height, false);
      canvas.putPixels(buf, 0, 0);
    } else if (c?.kind === 'patch') {
      canvas.putPixels(c[side], c.x, c.y);
    }
    if (entry.objects.length) {
      objects.load(applyObjectChanges(objects.serialize(), entry.objects, side));
    }
  }

  /** 完成進行中的一步 */
  function commit() {
    if (!pending) return;
    const entry = buildEntry(pending);
    pending = null;
    if (entry) {
      undoStack.push(entry);
      let discarded = redoStack.length > 0;
      redoStack = [];
      while (undoStack.length > maxSteps) {
        undoStack.shift();
        discarded = true;
      }
      if (discarded) opts.onDiscard?.();
    }
    notify();
  }

  return {
    /** 在修改「之前」呼叫 */
    push() {
      if (groupDepth > 0) {
        // 群組中：只在第一次 push 時拍快照，之後的修改都併入同一步
        if (!pending) pending = { pixels: fullPixels(), objects: objects.serialize() };
        notify();
        return;
      }
      commit();
      pending = { pixels: fullPixels(), objects: objects.serialize() };
      notify();
      // 一般操作在目前的事件處理結束後自動完成
      queueMicrotask(() => {
        if (groupDepth === 0) commit();
      });
    },

    /** 開始一個跨多個事件的操作（例如拖曳） */
    beginGroup() {
      groupDepth++;
    },

    /** 結束操作；最外層結束時完成這一步 */
    endGroup() {
      if (groupDepth === 0) return;
      groupDepth--;
      if (groupDepth === 0) commit();
    },

    commit,

    /** 放棄進行中的一步並還原（例如觸控時改為捏合縮放） */
    revert() {
      groupDepth = 0;
      if (!pending) return;
      const p = pending;
      pending = null;
      if (p.pixels.width !== canvas.width || p.pixels.height !== canvas.height) {
        canvas.setSize(p.pixels.width, p.pixels.height, false);
      }
      canvas.putPixels(p.pixels, 0, 0);
      objects.load(p.objects);
      notify();
    },

    undo() {
      opts.finishPending?.();
      commit();
      const entry = undoStack.pop();
      if (!entry) return;
      apply(entry, 'before');
      redoStack.push(entry);
      notify();
    },

    redo() {
      opts.finishPending?.();
      commit();
      const entry = redoStack.pop();
      if (!entry) return;
      apply(entry, 'after');
      undoStack.push(entry);
      notify();
    },

    /** 清空所有紀錄（目前的作品保留） */
    clear() {
      commit();
      undoStack = [];
      redoStack = [];
      opts.onDiscard?.();
      notify();
    },

    /** 紀錄中引用到的所有圖片 id */
    referencedAssets(): Set<string> {
      const ids = new Set<string>();
      for (const e of [...undoStack, ...redoStack]) {
        for (const c of e.objects) {
          if (c.before) ids.add(c.before.assetId);
          if (c.after) ids.add(c.after.assetId);
        }
      }
      if (pending) pending.objects.forEach(o => ids.add(o.assetId));
      return ids;
    },

    /** 目前的紀錄（供自動保存序列化） */
    entries() {
      commit();
      return { undo: [...undoStack], redo: [...redoStack] };
    },

    /** 從序列化資料還原紀錄 */
    restore(data: { undo: HistoryEntry[]; redo: HistoryEntry[] }) {
      pending = null;
      undoStack = [...data.undo];
      redoStack = [...data.redo];
      notify();
    },

    get bytes() {
      return totalBytes();
    },
    get steps() {
      return undoStack.length;
    },
  };
}

export type History = ReturnType<typeof createHistory>;
