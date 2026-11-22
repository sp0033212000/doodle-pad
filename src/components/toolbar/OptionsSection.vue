<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { MAGNIFY_RANGE, SHAPE_MODES, SIZE_RANGE, type ShapeMode } from '../../engine';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const { size, shapeMode, penOnly, penDetected, tool, magnify } = storeToRefs(editor);

const valueOf = (e: Event) => (e.target as HTMLInputElement | HTMLSelectElement).value;
// 調整完交還焦點，鍵盤快捷鍵才能繼續使用
const blur = (e: Event) => (e.target as HTMLElement).blur();

function onShapeMode(e: Event) {
  editor.setShapeMode(valueOf(e) as ShapeMode);
  blur(e);
}

/** 倍率取整數並限制在範圍內；確定後把欄位改成實際使用的值 */
function onMagnify(e: Event, commit = false) {
  const raw = Math.round(Number(valueOf(e)));
  if (!Number.isFinite(raw) || raw <= 0) return;
  const v = Math.min(MAGNIFY_RANGE.max, Math.max(MAGNIFY_RANGE.min, raw));
  editor.setMagnify(v);
  if (commit) (e.target as HTMLInputElement).value = String(v);
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
    <label v-if="tool === 'magnifier'" class="fill-opt magnify-opt" :title="t('options.magnifyTitle')">
      🔍 {{ t('options.magnify') }}
      <input
        class="num"
        type="number"
        data-control="magnify"
        :min="MAGNIFY_RANGE.min"
        :max="MAGNIFY_RANGE.max"
        :value="magnify"
        @input="onMagnify($event)"
        @change="onMagnify($event, true)"
        @keydown.enter="blur"
      />×
    </label>
    <label v-if="penDetected" class="fill-opt pen-opt">
      <input
        type="checkbox"
        data-control="pen-only"
        :checked="penOnly"
        @change="editor.setPenOnly(($event.target as HTMLInputElement).checked)"
      />
      ✍️ {{ t('options.penOnly') }}
    </label>
  </ToolbarGroup>
</template>
