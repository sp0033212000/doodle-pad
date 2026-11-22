<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import { usePaletteStore, CUSTOM_LIMIT } from '../../stores/palette';
import { hexToRgba, hsvToRgb, parseHex, rgbToHex, rgbToHsv, type HSV } from '../../engine/utils/color';
import BaseDialog from './BaseDialog.vue';

/**
 * 編輯色彩：色相 / 飽和度方塊、色相與透明度滑桿、HEX / RGB / 透明度輸入，
 * 並可把顏色加入「自訂色彩」或刪除自訂色彩。
 */
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const editor = useEditorStore();
const palette = usePaletteStore();

type Target = 'primary' | 'secondary';
const target = ref<Target>(editor.colorTarget);
const original = computed(() => (target.value === 'primary' ? editor.primary : editor.secondary));

const hsv = ref<HSV>({ h: 0, s: 0, v: 0 });
const alpha = ref(255);
const hexText = ref('');

function load(hex: string) {
  const [r, g, b, a] = hexToRgba(hex);
  const next = rgbToHsv(r, g, b);
  // 灰階沒有色相，沿用目前的色相，避免滑桿跳回 0
  if (next.s === 0) next.h = hsv.value.h;
  hsv.value = next;
  alpha.value = a;
  hexText.value = rgbToHex(r, g, b, a);
}
load(original.value);

const rgb = computed(() => hsvToRgb(hsv.value));
const color = computed(() => rgbToHex(...rgb.value, alpha.value));
const hueColor = computed(() => rgbToHex(...hsvToRgb({ h: hsv.value.h, s: 1, v: 1 })));
const syncHex = () => (hexText.value = color.value);

function switchTarget(next: Target) {
  target.value = next;
  load(original.value);
}

// ---------- 飽和度 / 明度方塊 ----------
const area = ref<HTMLDivElement>();
function pickArea(e: PointerEvent) {
  const r = area.value!.getBoundingClientRect();
  const s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
  hsv.value = { ...hsv.value, s, v };
  syncHex();
}
function onAreaDown(e: PointerEvent) {
  area.value!.setPointerCapture(e.pointerId);
  pickArea(e);
}
function onAreaMove(e: PointerEvent) {
  if (e.buttons) pickArea(e);
}
/** 方向鍵微調（鍵盤可操作） */
function onAreaKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 0.1 : 0.01;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  };
  const m = moves[e.key];
  if (!m) return;
  e.preventDefault();
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  hsv.value = { ...hsv.value, s: clamp(hsv.value.s + m[0]), v: clamp(hsv.value.v + m[1]) };
  syncHex();
}

// ---------- 輸入欄位 ----------
const num = (e: Event) => Number((e.target as HTMLInputElement).value);

function onHue(e: Event) {
  hsv.value = { ...hsv.value, h: num(e) };
  syncHex();
}
function onAlphaPercent(e: Event) {
  alpha.value = Math.round((Math.min(100, Math.max(0, num(e))) / 100) * 255);
  syncHex();
}
function onChannel(i: 0 | 1 | 2, e: Event) {
  const next = [...rgb.value] as [number, number, number];
  next[i] = Math.min(255, Math.max(0, Math.round(num(e)) || 0));
  load(rgbToHex(...next, alpha.value));
}
function onHex(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  hexText.value = value;
  if (parseHex(value)) {
    const keep = hexText.value;
    load(value);
    hexText.value = keep; // 輸入中不要改寫使用者正在打的字
  }
}

const alphaPercent = computed(() => Math.round((alpha.value / 255) * 100));
const canAddCustom = computed(() => !palette.custom.includes(color.value));

function ok() {
  if (target.value === 'primary') editor.setPrimary(color.value);
  else editor.setSecondary(color.value);
  emit('close');
}
</script>

<template>
  <BaseDialog wide :title="t('colorEditor.title')" @ok="ok" @cancel="emit('close')">
    <div class="dialog-row color-target" role="radiogroup">
      <label class="radio">
        <input
          type="radio"
          name="color-target"
          value="primary"
          :checked="target === 'primary'"
          @change="switchTarget('primary')"
        />
        {{ t('colorEditor.primary') }}
      </label>
      <label class="radio">
        <input
          type="radio"
          name="color-target"
          value="secondary"
          :checked="target === 'secondary'"
          @change="switchTarget('secondary')"
        />
        {{ t('colorEditor.secondary') }}
      </label>
    </div>

    <div class="color-editor">
      <div
        ref="area"
        class="sv-area"
        data-testid="sv-area"
        tabindex="0"
        role="slider"
        :aria-label="t('colorEditor.saturation')"
        :aria-valuetext="`${Math.round(hsv.s * 100)}%, ${Math.round(hsv.v * 100)}%`"
        :style="{ '--hue': hueColor }"
        @pointerdown="onAreaDown"
        @pointermove="onAreaMove"
        @keydown="onAreaKey"
      >
        <div class="sv-thumb" :style="{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }" />
      </div>

      <div class="color-side">
        <div class="color-compare">
          <div class="checker">
            <div :style="{ background: original }" :title="t('colorEditor.current')" />
          </div>
          <div class="checker">
            <div data-testid="color-preview" :style="{ background: color }" :title="t('colorEditor.new')" />
          </div>
        </div>
        <label class="field">
          HEX
          <input
            class="num hex"
            type="text"
            data-control="hex"
            :value="hexText"
            spellcheck="false"
            @input="onHex"
          />
        </label>
        <div class="rgb">
          <label v-for="(ch, i) in ['R', 'G', 'B'] as const" :key="ch" class="field">
            {{ ch }}
            <input
              class="num"
              type="number"
              min="0"
              max="255"
              :data-control="ch.toLowerCase()"
              :value="rgb[i]"
              @change="onChannel(i as 0 | 1 | 2, $event)"
            />
          </label>
        </div>
      </div>
    </div>

    <label class="field slider-field">
      {{ t('colorEditor.hue') }}
      <input
        class="hue-slider"
        type="range"
        min="0"
        max="359"
        data-control="hue"
        :value="Math.round(hsv.h)"
        @input="onHue"
      />
    </label>
    <label class="field slider-field">
      {{ t('colorEditor.opacity') }}
      <span class="alpha-track checker" :style="{ '--c': rgbToHex(...rgb) }">
        <input
          class="alpha-slider"
          type="range"
          min="0"
          max="100"
          :value="alphaPercent"
          @input="onAlphaPercent"
        />
      </span>
      <input
        class="num small"
        type="number"
        min="0"
        max="100"
        data-control="alpha"
        :value="alphaPercent"
        @change="onAlphaPercent"
      />%
    </label>

    <div class="custom-manage">
      <div class="custom-head">
        <span>{{ t('colorEditor.custom', { n: palette.custom.length, max: CUSTOM_LIMIT }) }}</span>
        <button
          class="act"
          data-action="add-custom"
          :disabled="!canAddCustom"
          @click="palette.addCustom(color)"
        >
          ＋ {{ t('colorEditor.addCustom') }}
        </button>
      </div>
      <div class="custom-list">
        <div v-for="c in palette.custom" :key="c" class="custom-chip checker">
          <button class="chip" :style="{ background: c }" :title="c" @click="load(c)" />
          <button
            class="chip-remove"
            data-action="remove-custom"
            :title="t('colorEditor.removeCustom')"
            @click="palette.removeCustom(c)"
          >
            ×
          </button>
        </div>
        <span v-if="!palette.custom.length" class="dialog-note">{{ t('colorEditor.customEmpty') }}</span>
      </div>
    </div>
  </BaseDialog>
</template>

<style>
.color-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.sv-area {
  position: relative;
  flex: none;
  width: 180px;
  height: 150px;
  border-radius: 6px;
  cursor: crosshair;
  touch-action: none;
  background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, var(--hue));
  outline-offset: 2px;
}
.sv-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
.color-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 190px;
}
.color-compare {
  display: flex;
  height: 34px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.color-compare > div {
  flex: 1;
}
.color-compare > div > div {
  width: 100%;
  height: 100%;
}
.field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}
.dialog .field .num {
  width: auto;
  min-width: 0;
  flex: 1;
}
.dialog .field .num.small {
  flex: none;
  width: 64px;
}
.rgb {
  display: flex;
  gap: 6px;
}
.rgb .field {
  flex: 1;
}
.dialog .rgb .field .num {
  width: 100%;
}
.slider-field input[type='range'] {
  flex: 1;
}
.hue-slider {
  appearance: none;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}
.alpha-track {
  flex: 1;
  display: flex;
  border-radius: 6px;
}
.alpha-slider {
  appearance: none;
  width: 100%;
  height: 12px;
  margin: 0;
  border-radius: 6px;
  background: linear-gradient(to right, transparent, var(--c));
}
.hue-slider::-webkit-slider-thumb,
.alpha-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #777;
}
.custom-manage {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}
.custom-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
}
.custom-head .act {
  height: 28px;
  font-size: 12px;
}
.custom-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.custom-chip {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}
.custom-chip .chip {
  width: 100%;
  height: 100%;
  border: 1px solid #888;
  border-radius: 6px;
  cursor: pointer;
}
.custom-chip .chip-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
</style>
