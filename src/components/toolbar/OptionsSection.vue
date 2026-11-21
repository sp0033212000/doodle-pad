<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { SHAPE_MODES, SIZE_RANGE, type ShapeMode } from '../../engine';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const { size, shapeMode } = storeToRefs(editor);

const valueOf = (e: Event) => (e.target as HTMLInputElement | HTMLSelectElement).value;
// 調整完交還焦點，鍵盤快捷鍵才能繼續使用
const blur = (e: Event) => (e.target as HTMLElement).blur();

function onShapeMode(e: Event) {
  editor.setShapeMode(valueOf(e) as ShapeMode);
  blur(e);
}
</script>

<template>
  <ToolbarGroup :label="t('toolbar.options')" body-class="options">
    <div class="size-wrap">
      {{ t('options.size') }}
      <input
        type="range"
        data-control="size"
        :min="SIZE_RANGE.min"
        :max="SIZE_RANGE.max"
        :value="size"
        @input="editor.setSize(Number(valueOf($event)))"
        @change="blur"
      />
      <span>{{ size }}</span>px
    </div>
    <div class="fill-opt">
      {{ t('options.shape') }}
      <select data-control="shape-mode" :value="shapeMode" @change="onShapeMode">
        <option v-for="mode in SHAPE_MODES" :key="mode" :value="mode">
          {{ t(`options.modes.${mode}`) }}
        </option>
      </select>
    </div>
  </ToolbarGroup>
</template>
