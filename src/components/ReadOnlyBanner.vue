<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="read-only-banner" data-testid="read-only-banner" role="status">
    🔒 {{ t('readOnly.message') }}
  </div>
</template>

<style>
.read-only-banner {
  padding: 8px 16px;
  font-size: 13px;
  background: #fff4d6;
  border-bottom: 1px solid #f0d58c;
  color: #6b5200;
  text-align: center;
}

/* 唯讀時畫布與工具列不接受操作（縮放列仍可使用） */
body.read-only .toolbar,
body.read-only .stage {
  pointer-events: none;
}
body.read-only .toolbar {
  opacity: 0.55;
}
</style>
