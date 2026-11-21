<script setup lang="ts">
import { markRaw, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { createEngine, setTranslator, startEngine } from './engine';
import { useEditorStore } from './stores/editor';
import AppToolbar from './components/toolbar/AppToolbar.vue';
import StatusBar from './components/StatusBar.vue';
import ResizeDialog from './components/dialogs/ResizeDialog.vue';

const { t } = useI18n();
// 引擎產生的 DOM（物件 / 選取的操作列、提示訊息）也使用同一套翻譯
setTranslator((key, params) => t(key, params ?? {}));

// 引擎不交給 Vue 追蹤（markRaw），介面只透過 Pinia store 讀取它的狀態
const engine = markRaw(createEngine());
const editor = useEditorStore();
editor.bind(engine);

const host = ref<HTMLDivElement>();
onMounted(() => {
  host.value!.append(engine.stage);
  startEngine(engine);
});
</script>

<template>
  <AppToolbar />
  <div ref="host" class="stage-host" />
  <StatusBar />
  <ResizeDialog v-if="editor.dialog === 'resize'" @close="editor.closeDialog()" />
</template>

<style>
.stage-host {
  display: contents;
}
</style>
