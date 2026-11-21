<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { PALETTE } from '../../engine';
import { useEditorStore } from '../../stores/editor';
import { usePaletteStore, CUSTOM_LIMIT } from '../../stores/palette';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const palette = usePaletteStore();
const { primary, secondary, useSecondary } = storeToRefs(editor);
const { custom, recent } = storeToRefs(palette);
</script>

<template>
  <ToolbarGroup :label="t('toolbar.colors')" body-class="colors">
    <div class="current">
      <div
        class="sw primary checker"
        :title="t('colors.primaryTitle')"
        @click="editor.openColorEditor('primary')"
      >
        <span :style="{ background: primary }" />
      </div>
      <div class="sw secondary checker" :title="t('colors.secondaryTitle')" @click="editor.swapColors()">
        <span :style="{ background: secondary }" />
      </div>
    </div>
    <button
      class="act use-secondary"
      :class="{ active: useSecondary }"
      data-action="toggle-secondary"
      :title="t('colors.useSecondaryTitle')"
      :aria-pressed="useSecondary"
      @click="editor.toggleSecondary()"
    >
      {{ useSecondary ? t('colors.usingSecondary') : t('colors.usingPrimary') }}
    </button>

    <div class="palettes">
      <div class="palette">
        <div
          v-for="color in PALETTE"
          :key="color"
          :title="color"
          :style="{ background: color }"
          @click="editor.setPrimary(color)"
          @contextmenu.prevent="editor.setSecondary(color)"
        />
      </div>
      <!-- 自訂色彩：空格點一下開啟「編輯色彩」 -->
      <div class="palette-row" data-testid="custom-colors" :title="t('colors.customRow')">
        <div
          v-for="i in CUSTOM_LIMIT"
          :key="i"
          class="slot checker"
          :class="{ empty: !custom[i - 1] }"
          :title="custom[i - 1] ?? t('colors.addCustomSlot')"
          @click="custom[i - 1] ? editor.setPrimary(custom[i - 1]) : editor.openColorEditor('primary')"
          @contextmenu.prevent="custom[i - 1] && editor.setSecondary(custom[i - 1])"
        >
          <span v-if="custom[i - 1]" :style="{ background: custom[i - 1] }" />
        </div>
      </div>
      <!-- 最近使用的顏色 -->
      <div class="palette-row recent" data-testid="recent-colors" :title="t('colors.recentRow')">
        <span class="row-label">{{ t('colors.recent') }}</span>
        <div
          v-for="c in recent"
          :key="c"
          class="slot checker"
          :title="c"
          @click="editor.setPrimary(c)"
          @contextmenu.prevent="editor.setSecondary(c)"
        >
          <span :style="{ background: c }" />
        </div>
      </div>
    </div>

    <button
      class="act edit-colors"
      data-action="edit-colors"
      :title="t('colors.editTitle')"
      @click="editor.openColorEditor('primary')"
    >
      🎨 {{ t('colors.edit') }}
    </button>
  </ToolbarGroup>
</template>
