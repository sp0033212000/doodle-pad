import { ref } from 'vue';
import { acquireTabLock, createAutosave, type App } from '../engine';

const LOCK_NAME = 'doodle-pad-editor';

/**
 * 自動保存與跨分頁鎖的流程：
 *  - 取得鎖的分頁：載入上次的作品並開始自動保存
 *  - 沒取得鎖的分頁：載入最新存檔，進入唯讀模式；等其他分頁關閉後自動切換成可編輯
 */
export function usePersistence(engine: App) {
  const autosave = createAutosave(engine);
  const ready = ref(false);

  async function becomeEditor() {
    await autosave.restore();
    engine.store.set('readOnly', false);
    autosave.start();
  }

  async function init() {
    const owner = await acquireTabLock(LOCK_NAME, () => void becomeEditor());
    if (owner) {
      await becomeEditor();
    } else {
      await autosave.restore();
      engine.store.set('readOnly', true);
    }
    ready.value = true;
  }

  return { init, ready, autosave };
}
