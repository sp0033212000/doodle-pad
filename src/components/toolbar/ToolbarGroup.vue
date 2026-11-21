<script setup lang="ts">
/** 工具列中的一個區塊：內容 + 底部標籤 */
defineProps<{ label: string; bodyClass?: string }>();
</script>

<template>
  <div class="group">
    <div class="group-body" :class="bodyClass"><slot /></div>
    <div class="group-label">{{ label }}</div>
  </div>
</template>
