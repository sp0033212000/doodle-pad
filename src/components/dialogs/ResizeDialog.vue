<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import { convertUnit, linkedValue, toPixels, type ResizeUnit } from '../../composables/resize';
import BaseDialog from './BaseDialog.vue';

/**
 * 調整大小：可用百分比或像素，可維持長寬比。
 * 作用對象依序為：選取的物件 → 選取範圍 → 整張圖片（由引擎決定）。
 */
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const editor = useEditorStore();
const image = editor.engine().image;
const target = image.resizeTarget();
const { w: ow, h: oh } = target;

const unit = ref<ResizeUnit>('percent');
const w = ref(100);
const h = ref(100);
const keep = ref(true);

const result = computed(() => {
  const { nw, nh } = toPixels({ unit: unit.value, w: w.value || 0, h: h.value || 0, ow, oh });
  return { nw: image.clampSize(nw), nh: image.clampSize(nh) };
});

function onInput(changed: 'w' | 'h', e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  if (changed === 'w') w.value = value;
  else h.value = value;
  if (!keep.value || !value) return;
  const other = linkedValue(unit.value, value, ow, oh, changed);
  if (changed === 'w') h.value = other;
  else w.value = other;
}

function switchUnit(next: ResizeUnit) {
  const { nw, nh } = result.value;
  unit.value = next;
  ({ w: w.value, h: h.value } = convertUnit(next, nw, nh, ow, oh));
}

function ok() {
  target.apply(result.value.nw, result.value.nh);
  emit('close');
}
</script>

<template>
  <BaseDialog
    :title="t('resize.title', { target: t(`resize.targets.${target.kind}`) })"
    @ok="ok"
    @cancel="emit('close')"
  >
    <div class="dialog-row">
      <span class="dialog-label">{{ t('resize.unit') }}</span>
      <label class="radio">
        <input
          type="radio"
          name="resize-unit"
          value="percent"
          :checked="unit === 'percent'"
          @change="switchUnit('percent')"
        />
        {{ t('resize.percent') }}
      </label>
      <label class="radio">
        <input
          type="radio"
          name="resize-unit"
          value="pixel"
          :checked="unit === 'pixel'"
          @change="switchUnit('pixel')"
        />
        {{ t('resize.pixel') }}
      </label>
    </div>
    <div class="dialog-row">
      <span class="dialog-label">{{ t('resize.horizontal') }}</span>
      <input class="num" type="number" min="1" :value="w" @input="onInput('w', $event)" />
    </div>
    <div class="dialog-row">
      <span class="dialog-label">{{ t('resize.vertical') }}</span>
      <input class="num" type="number" min="1" :value="h" @input="onInput('h', $event)" />
    </div>
    <label class="dialog-row check">
      <input v-model="keep" type="checkbox" />
      {{ t('resize.keepRatio') }}
    </label>
    <div class="dialog-note">{{ t('resize.preview', { ow, oh, ...result }) }}</div>
  </BaseDialog>
</template>
