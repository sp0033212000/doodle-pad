<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * 模態對話框外框。Enter = 確定、Esc = 取消、點背景 = 取消。
 * 對話框開啟時，引擎的快捷鍵會自動停用（見 engine/utils/keys 的 shouldIgnore）。
 */
defineProps<{ title: string; okLabel?: string; cancelLabel?: string; wide?: boolean }>();
const emit = defineEmits<{ ok: []; cancel: [] }>();
const { t } = useI18n();
const dialog = ref<HTMLDivElement>();

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    emit('ok');
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('cancel');
  }
  e.stopPropagation();
}

onMounted(async () => {
  await nextTick();
  const first = dialog.value?.querySelector<HTMLInputElement>('input[type=number], input[type=text]');
  first?.focus();
  first?.select();
});
</script>

<template>
  <Teleport to="body">
    <div class="dialog-backdrop" @pointerdown.self="emit('cancel')">
      <div ref="dialog" class="dialog" :class="{ wide }" role="dialog" aria-modal="true" @keydown="onKeydown">
        <div class="dialog-title">{{ title }}</div>
        <div class="dialog-body"><slot /></div>
        <div class="dialog-actions">
          <button class="act" data-action="dialog-cancel" @click="emit('cancel')">
            {{ cancelLabel ?? t('dialog.cancel') }}
          </button>
          <button class="act primary" data-action="dialog-ok" @click="emit('ok')">
            {{ okLabel ?? t('dialog.ok') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
