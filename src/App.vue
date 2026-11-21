<script setup lang="ts">
import { markRaw, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { applyLabels, createEngine, setTranslator, startEngine } from './engine';
import { useEditorStore } from './stores/editor';
import { usePersistence } from './composables/usePersistence';
import AppToolbar from './components/toolbar/AppToolbar.vue';
import StatusBar from './components/StatusBar.vue';
import ReadOnlyBanner from './components/ReadOnlyBanner.vue';
import UpdatePrompt from './components/UpdatePrompt.vue';
import SideToolbar from './components/side/SideToolbar.vue';
import SettingsDrawer from './components/side/SettingsDrawer.vue';
import { useMediaQuery, COMPACT_QUERY } from './composables/useMediaQuery';
import ResizeDialog from './components/dialogs/ResizeDialog.vue';
import QuotaDialog from './components/dialogs/QuotaDialog.vue';
import ExportDialog from './components/dialogs/ExportDialog.vue';
import ClearHistoryDialog from './components/dialogs/ClearHistoryDialog.vue';

const { t, locale } = useI18n();
// 引擎產生的 DOM（物件 / 選取的操作列、提示訊息）也使用同一套翻譯
setTranslator((key, params) => t(key, params ?? {}));

// 引擎不交給 Vue 追蹤（markRaw），介面只透過 Pinia store 讀取它的狀態
const engine = markRaw(createEngine());
const editor = useEditorStore();
editor.bind(engine);
const { readOnly, historyOverQuota, dialog } = storeToRefs(editor);

// 窄螢幕：側邊工具列 + 可展開的設定面板；寬螢幕：上方工具列
const compact = useMediaQuery(COMPACT_QUERY);
const drawerOpen = ref(false);
watch(compact, c => !c && (drawerOpen.value = false));

const persistence = usePersistence(engine);
const host = ref<HTMLDivElement>();

onMounted(async () => {
  host.value!.append(engine.stage);
  startEngine(engine);
  await persistence.init();
  // 載入完成的標記（E2E 測試會等待它）
  document.body.dataset.ready = 'true';
});

// 切換語言：更新引擎產生的 DOM 文字、<html lang>、頁面標題
watch(
  locale,
  l => {
    applyLabels(engine.stage);
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-Hant';
    document.title = t('app.pageTitle');
    document.querySelector('meta[name=description]')?.setAttribute('content', t('app.description'));
  },
  { immediate: true },
);

// 唯讀時停用畫布與快捷鍵（engine/utils/keys 會檢查 body.read-only）
watch(readOnly, ro => document.body.classList.toggle('read-only', ro), { immediate: true });

// 復原紀錄超過容量上限時提醒一次（回到上限以下後才會再次提醒）
watch(historyOverQuota, over => {
  if (over && !dialog.value) editor.openDialog('quota');
});
</script>

<template>
  <ReadOnlyBanner v-if="readOnly" />
  <AppToolbar v-if="!compact" />
  <div class="workspace">
    <SideToolbar v-if="compact" :drawer-open="drawerOpen" @toggle-drawer="drawerOpen = !drawerOpen" />
    <div ref="host" class="stage-host" />
  </div>
  <SettingsDrawer v-if="compact && drawerOpen" @close="drawerOpen = false" />
  <StatusBar />
  <UpdatePrompt />
  <ResizeDialog v-if="dialog === 'resize'" @close="editor.closeDialog()" />
  <QuotaDialog v-if="dialog === 'quota'" @close="editor.closeDialog()" />
  <ExportDialog v-if="dialog === 'export'" @close="editor.closeDialog()" />
  <ClearHistoryDialog v-if="dialog === 'clearHistory'" @close="editor.closeDialog()" />
</template>

<style>
.workspace {
  flex: 1;
  display: flex;
  min-height: 0;
}
.stage-host {
  display: contents;
}
.workspace .stage {
  min-width: 0;
}
</style>
