<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import BaseDialog from './BaseDialog.vue';

/** 匯出專案檔之後：詢問是否清空復原紀錄（作品保留） */
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const editor = useEditorStore();

function clear() {
  editor.clearHistory();
  emit('close');
}
</script>

<template>
  <BaseDialog
    :title="t('project.exportedTitle')"
    :ok-label="t('quota.clear')"
    :cancel-label="t('project.keepHistory')"
    @ok="clear"
    @cancel="emit('close')"
  >
    <p class="dialog-text">{{ t('project.clearHistoryQuestion') }}</p>
    <p class="dialog-note">{{ t('quota.hint') }}</p>
  </BaseDialog>
</template>
