<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { HISTORY_LIMITS } from '../../engine';
import { useEditorStore } from '../../stores/editor';
import BaseDialog from './BaseDialog.vue';

/** 復原紀錄超過容量上限時的提醒：建議先匯出專案檔，再清空紀錄 */
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const editor = useEditorStore();
const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

function clearNow() {
  editor.clearHistory();
  emit('close');
}
</script>

<template>
  <BaseDialog
    :title="t('quota.title')"
    :ok-label="t('quota.export')"
    :cancel-label="t('quota.later')"
    @ok="editor.openDialog('export')"
    @cancel="emit('close')"
  >
    <p class="dialog-text">
      {{ t('quota.message', { used: mb(editor.historyBytes), limit: mb(HISTORY_LIMITS.maxBytes) }) }}
    </p>
    <p class="dialog-note">{{ t('quota.hint') }}</p>
    <button class="link-btn" data-action="quota-clear" @click="clearNow">
      {{ t('quota.clearWithoutExport') }}
    </button>
  </BaseDialog>
</template>
