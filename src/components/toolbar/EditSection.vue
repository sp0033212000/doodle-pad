<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const { canUndo, canRedo, hasSelection, hasRegion } = storeToRefs(editor);
const canCopy = computed(() => hasSelection.value || hasRegion.value);
</script>

<template>
  <ToolbarGroup :label="t('toolbar.edit')">
    <button
      class="act"
      data-action="undo"
      :title="t('edit.undoTitle')"
      :disabled="!canUndo"
      @click="editor.undo()"
    >
      ↶
    </button>
    <button
      class="act"
      data-action="redo"
      :title="t('edit.redoTitle')"
      :disabled="!canRedo"
      @click="editor.redo()"
    >
      ↷
    </button>
    <!-- pointerdown.prevent：按下按鈕時不要先觸發「取消選取」 -->
    <button
      class="act"
      data-action="cut"
      :title="t('edit.cutTitle')"
      :disabled="!canCopy"
      @pointerdown.prevent
      @click="editor.cut()"
    >
      ✂️ {{ t('edit.cut') }}
    </button>
    <button
      class="act"
      data-action="copy"
      :title="t('edit.copyTitle')"
      :disabled="!canCopy"
      @pointerdown.prevent
      @click="editor.copy()"
    >
      📄 {{ t('edit.copy') }}
    </button>
    <button class="act" data-action="paste" :title="t('edit.pasteTitle')" @click="editor.paste()">
      📋 {{ t('edit.paste') }}
    </button>
  </ToolbarGroup>
</template>
