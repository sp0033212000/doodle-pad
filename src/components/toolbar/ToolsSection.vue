<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { TOOLS } from '../../engine';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const { tool } = storeToRefs(editor);
</script>

<template>
  <ToolbarGroup :label="t('toolbar.tools')" body-class="tools-grid">
    <button
      v-for="item in TOOLS"
      :key="item.id"
      class="tool"
      :class="{ active: item.id === tool }"
      :data-tool="item.id"
      :title="`${t(`tools.${item.id}`)} (${item.key.toUpperCase()})`"
      @click="editor.setTool(item.id)"
    >
      {{ item.icon }}
    </button>
  </ToolbarGroup>
</template>
