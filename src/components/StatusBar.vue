<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../stores/editor';

const { t } = useI18n();
const editor = useEditorStore();
const { cursorPos, canvasSize, tool, zoom } = storeToRefs(editor);

const posText = computed(() => (cursorPos.value ? t('status.pos', cursorPos.value) : t('status.posNone')));
const zoomText = computed(() => `${Math.round(zoom.value * 100)}%`);
</script>

<template>
  <div class="statusbar">
    <span>{{ posText }}</span>
    <span>{{ t('status.canvas', canvasSize) }}</span>
    <span>{{ t('status.tool', { name: t(`tools.${tool}`) }) }}</span>
    <span class="zoom">
      <button data-action="zoom-out" :title="t('status.zoomOut')" @click="editor.zoomOut()">−</button>
      <button
        class="zoom-label"
        data-action="zoom-reset"
        :title="t('status.zoomReset')"
        @click="editor.zoomReset()"
      >
        {{ zoomText }}
      </button>
      <button data-action="zoom-in" :title="t('status.zoomIn')" @click="editor.zoomIn()">+</button>
    </span>
  </div>
</template>
