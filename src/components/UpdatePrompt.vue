<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRegisterSW } from 'virtual:pwa-register/vue';

/**
 * PWA 提示：
 *  - 第一次快取完成 → 「已可離線使用」（幾秒後自動消失）
 *  - 有新版本 → 「有新版本」，按「重新整理」才更新（不會中斷正在畫的內容；作品已自動保存）
 */
const { t } = useI18n();
const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW();

watch(offlineReady, ready => {
  if (ready) setTimeout(() => (offlineReady.value = false), 4000);
});

function close() {
  needRefresh.value = false;
  offlineReady.value = false;
}
</script>

<template>
  <div v-if="needRefresh || offlineReady" class="toast" role="status" data-testid="pwa-toast">
    <span>{{ needRefresh ? t('pwa.needRefresh') : t('pwa.offlineReady') }}</span>
    <button
      v-if="needRefresh"
      class="act primary"
      data-action="pwa-reload"
      @click="updateServiceWorker(true)"
    >
      {{ t('pwa.reload') }}
    </button>
    <button class="act" data-action="pwa-close" @click="close">{{ t('pwa.close') }}</button>
  </div>
</template>

<style>
.toast {
  position: fixed;
  right: 16px;
  bottom: 40px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 10px 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  font-size: 13px;
}
.toast .act {
  height: 30px;
}
.toast .act.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
