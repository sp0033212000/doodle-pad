import type { App } from '../types';
import type { HistoryEntry } from '../core/history';
import {
  captureDocument,
  applyDocument,
  SETTINGS_KEYS,
  type DocumentSnapshot,
  type SerializedAsset,
} from './document';
import { openDb, request, done } from './db';

interface StoredDoc extends Omit<DocumentSnapshot, 'assets' | 'history'> {
  undoIds: number[];
  redoIds: number[];
  assetIds: string[];
  savedAt: number;
}

/**
 * 自動保存到 IndexedDB。
 *  - 操作後 1 秒沒有新操作才寫入；切換分頁 / 關閉頁面時立刻寫入
 *  - 復原紀錄的步驟與圖片只寫入新增的，已不存在的才刪除
 *  - 拖曳等操作進行中時延後，不會寫入一半的步驟
 */
export function createAutosave(app: App, { debounceMs = 1000 } = {}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let enabled = false;
  let saving: Promise<void> | null = null;
  const savedEntries = new Set<number>();
  const savedAssets = new Set<string>();

  async function save() {
    if (!enabled) return;
    if (app.history.busy) return schedule(); // 拖曳中，稍後再存

    const snap = captureDocument(app);
    const entries = [...snap.history.undo, ...snap.history.redo];
    const entryIds = new Set(entries.map(e => e.id));
    const assetIds = new Set(snap.assets.map(a => a.id));

    const db = await openDb();
    const tx = db.transaction(['doc', 'entries', 'assets'], 'readwrite');
    const doc: StoredDoc = {
      version: 1,
      canvas: snap.canvas,
      objects: snap.objects,
      settings: snap.settings,
      undoIds: snap.history.undo.map(e => e.id),
      redoIds: snap.history.redo.map(e => e.id),
      assetIds: [...assetIds],
      savedAt: Date.now(),
    };
    tx.objectStore('doc').put(doc, 'current');

    const entryStore = tx.objectStore('entries');
    for (const e of entries) if (!savedEntries.has(e.id)) entryStore.put(e);
    for (const id of savedEntries) if (!entryIds.has(id)) entryStore.delete(id);

    const assetStore = tx.objectStore('assets');
    for (const a of snap.assets) if (!savedAssets.has(a.id)) assetStore.put(a);
    for (const id of savedAssets) if (!assetIds.has(id)) assetStore.delete(id);

    await done(tx);
    savedEntries.clear();
    entryIds.forEach(id => savedEntries.add(id));
    savedAssets.clear();
    assetIds.forEach(id => savedAssets.add(id));
  }

  function schedule() {
    if (!enabled) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      saving = save().finally(() => {
        saving = null;
      });
    }, debounceMs);
  }

  /** 立刻寫入（等待進行中的寫入完成） */
  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (saving) await saving;
    await save();
  }

  /** 從 IndexedDB 載入上次的作品；沒有存檔時回傳 false */
  async function restore(): Promise<boolean> {
    const db = await openDb();
    const tx = db.transaction(['doc', 'entries', 'assets'], 'readonly');
    const doc = (await request(tx.objectStore('doc').get('current'))) as StoredDoc | undefined;
    if (!doc) return false;
    const allEntries = (await request(tx.objectStore('entries').getAll())) as HistoryEntry[];
    const assets = (await request(tx.objectStore('assets').getAll())) as SerializedAsset[];

    const byId = new Map(allEntries.map(e => [e.id, e]));
    const pick = (ids: number[]) => ids.map(id => byId.get(id)).filter((e): e is HistoryEntry => !!e);
    applyDocument(app, {
      version: 1,
      canvas: doc.canvas,
      objects: doc.objects,
      settings: doc.settings,
      assets,
      history: { undo: pick(doc.undoIds), redo: pick(doc.redoIds) },
    });

    savedEntries.clear();
    allEntries.forEach(e => savedEntries.add(e.id));
    savedAssets.clear();
    assets.forEach(a => savedAssets.add(a.id));
    return true;
  }

  /** 開始監聽變化並自動寫入 */
  function start() {
    if (enabled) return;
    enabled = true;
    app.store.on('revision', schedule);
    SETTINGS_KEYS.forEach(k => app.store.on(k, schedule));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
    window.addEventListener('pagehide', () => void flush());
  }

  return {
    restore,
    start,
    flush,
    save,
    get enabled() {
      return enabled;
    },
  };
}

export type Autosave = ReturnType<typeof createAutosave>;
