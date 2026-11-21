<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { PALETTE } from '../../engine';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const { primary, secondary } = storeToRefs(editor);
const custom = ref<HTMLInputElement>();
</script>

<template>
  <ToolbarGroup :label="t('toolbar.colors')" body-class="colors">
    <div class="current">
      <div
        class="sw primary"
        :style="{ background: primary }"
        :title="t('colors.primaryTitle')"
        @click="custom?.click()"
      />
      <div
        class="sw secondary"
        :style="{ background: secondary }"
        :title="t('colors.secondaryTitle')"
        @click="editor.swapColors()"
      />
    </div>
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
    <input
      ref="custom"
      type="color"
      :title="t('colors.customTitle')"
      :value="primary"
      @input="editor.setPrimary(($event.target as HTMLInputElement).value)"
      @change="($event.target as HTMLInputElement).blur()"
    />
  </ToolbarGroup>
</template>
