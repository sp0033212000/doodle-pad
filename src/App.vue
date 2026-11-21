<script setup lang="ts">
import { markRaw, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { createEngine, setTranslator, startEngine } from './engine';
import { useEditorStore } from './stores/editor';
import { usePersistence } from './composables/usePersistence';
import AppToolbar from './components/toolbar/AppToolbar.vue';
import StatusBar from './components/StatusBar.vue';
import ReadOnlyBanner from './components/ReadOnlyBanner.vue';
import ResizeDialog from './components/dialogs/ResizeDialog.vue';
import QuotaDialog from './components/dialogs/QuotaDialog.vue';

const { t } = useI18n();
// 引擎產生的 DOM（物件 / 選取的操作列、提示訊息）也使用同一套翻譯
setTranslator((key, params) => t(key, params ?? {}));

// 引擎不交給 Vue 追蹤（markRaw），介面只透過 Pinia store 讀取它的狀態
const engine = markRaw(createEngine());
const editor = useEditorStore();
editor.bind(engine);
const { readOnly, historyOverQuota, dialog } = storeToRefs(editor);

const persistence = usePersistence(engine);
const host = ref<HTMLDivElement>();

onMounted(async () => {
  host.value!.append(engine.stage);
  startEngine(engine);
  await persistence.init();
  // 載入完成的標記（E2E 測試會等待它）
  document.body.dataset.ready = 'true';
});

// 唯讀時停用畫布與快捷鍵（engine/utils/keys 會檢查 body.read-only）
watch(readOnly, ro => document.body.classList.toggle('read-only', ro), { immediate: true });

// 復原紀錄超過容量上限時提醒一次（回到上限以下後才會再次提醒）
watch(historyOverQuota, over => {
  if (over && !dialog.value) editor.openDialog('quota');
});
</script>

<template>
  <ReadOnlyBanner v-if="readOnly" />
  <AppToolbar />
  <div ref="host" class="stage-host" />
  <StatusBar />
  <ResizeDialog v-if="dialog === 'resize'" @close="editor.closeDialog()" />
  <QuotaDialog v-if="dialog === 'quota'" @close="editor.closeDialog()" />
</template>

<style>
.stage-host {
  display: contents;
}
</style>
