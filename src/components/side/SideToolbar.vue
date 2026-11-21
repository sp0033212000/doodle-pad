<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { TOOLS } from '../../engine';
import { useEditorStore } from '../../stores/editor';

/**
 * 窄螢幕的側邊工具列：選單、復原 / 重做、所有工具、目前顏色。
 * 其他設定（檔案、影像、粗細、調色盤…）收在 SettingsDrawer。
 */
defineProps<{ drawerOpen: boolean }>();
const emit = defineEmits<{ toggleDrawer: [] }>();
const { t } = useI18n();
const editor = useEditorStore();
const { tool, canUndo, canRedo, primary } = storeToRefs(editor);
</script>

<template>
  <aside class="side-toolbar" data-testid="side-toolbar">
    <button
      class="side-btn"
      :class="{ active: drawerOpen }"
      data-action="menu"
      :title="t('side.menu')"
      :aria-expanded="drawerOpen"
      @click="emit('toggleDrawer')"
    >
      ☰
    </button>
    <button
      class="side-btn"
      data-action="undo"
      :title="t('edit.undoTitle')"
      :disabled="!canUndo"
      @click="editor.undo()"
    >
      ↶
    </button>
    <button
      class="side-btn"
      data-action="redo"
      :title="t('edit.redoTitle')"
      :disabled="!canRedo"
      @click="editor.redo()"
    >
      ↷
    </button>
    <div class="side-sep" />
    <div class="side-tools">
      <button
        v-for="item in TOOLS"
        :key="item.id"
        class="side-btn tool"
        :class="{ active: item.id === tool }"
        :data-tool="item.id"
        :title="t(`tools.${item.id}`)"
        @click="editor.setTool(item.id)"
      >
        {{ item.icon }}
      </button>
    </div>
    <div class="side-sep" />
    <button
      class="side-btn color"
      data-action="colors"
      :title="t('side.colors')"
      :style="{ '--swatch': primary }"
      @click="emit('toggleDrawer')"
    />
  </aside>
</template>

<style>
.side-toolbar {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 60px;
  padding: 8px 0;
  background: var(--panel);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
.side-tools {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.side-toolbar .side-btn {
  width: 48px;
  height: 48px;
  flex: none;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  font-size: 22px;
  color: var(--text);
  cursor: pointer;
}
.side-toolbar .side-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.side-toolbar .side-btn.color::after {
  content: '';
  display: block;
  width: 28px;
  height: 28px;
  margin: auto;
  border-radius: 50%;
  background: var(--swatch);
  border: 2px solid #fff;
  outline: 1px solid #777;
}
.side-sep {
  width: 36px;
  height: 1px;
  margin: 4px 0;
  background: var(--border);
}
</style>
