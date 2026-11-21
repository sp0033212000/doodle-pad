<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import ToolbarGroup from './ToolbarGroup.vue';

const { t } = useI18n();
const editor = useEditorStore();
const { hasRegion } = storeToRefs(editor);
</script>

<template>
  <ToolbarGroup :label="t('toolbar.image')">
    <button
      class="act"
      data-action="crop"
      :title="t('image.cropTitle')"
      :disabled="!hasRegion"
      @click="editor.crop()"
    >
      ⌗ {{ t('image.crop') }}
    </button>
    <button
      class="act"
      data-action="resize"
      :title="t('image.resizeTitle')"
      @click="editor.openDialog('resize')"
    >
      ⤡ {{ t('image.resize') }}
    </button>
  </ToolbarGroup>
</template>
