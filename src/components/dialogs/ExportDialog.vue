<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from '../../stores/editor';
import BaseDialog from './BaseDialog.vue';

/** 匯出 .doodle 專案檔；匯出後若有復原紀錄，詢問是否清空以釋放空間 */
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const editor = useEditorStore();
const includeHistory = ref(false);

function ok() {
  editor.exportProject(includeHistory.value);
  if (editor.canUndo || editor.canRedo) editor.openDialog('clearHistory');
  else emit('close');
}
</script>

<template>
  <BaseDialog
    :title="t('project.exportTitle')"
    :ok-label="t('project.export')"
    @ok="ok"
    @cancel="emit('close')"
  >
    <p class="dialog-text">{{ t('project.exportMessage') }}</p>
    <label class="dialog-row check">
      <input v-model="includeHistory" type="checkbox" data-control="include-history" />
      {{ t('project.includeHistory') }}
    </label>
    <p class="dialog-note">{{ t('project.includeHistoryHint') }}</p>
  </BaseDialog>
</template>
