<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const fileInput = ref<HTMLInputElement>();

function onFile() {
  const input = fileInput.value!;
  editor.openFile(input.files?.[0]);
  input.value = '';
}
</script>

<template>
  <ToolbarGroup :label="t('toolbar.file')">
    <button class="act" data-action="new" :title="t('file.newTitle')" @click="editor.newCanvas()">
      🗋 {{ t('file.new') }}
    </button>
    <button class="act" data-action="open" :title="t('file.openTitle')" @click="fileInput?.click()">
      📂 {{ t('file.open') }}
    </button>
    <button class="act" data-action="save" :title="t('file.saveTitle')" @click="editor.save()">
      💾 {{ t('file.save') }}
    </button>
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
  </ToolbarGroup>
</template>
