<script setup lang="ts">
import FileSection from '../toolbar/FileSection.vue';
import EditSection from '../toolbar/EditSection.vue';
import ImageSection from '../toolbar/ImageSection.vue';
import OptionsSection from '../toolbar/OptionsSection.vue';
import ColorSection from '../toolbar/ColorSection.vue';

/** 窄螢幕的設定面板：重用工具列的各區塊，改成直向排列 */
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="drawer-backdrop" data-testid="drawer-backdrop" @pointerdown.self="emit('close')">
    <div class="drawer" data-testid="settings-drawer">
      <FileSection />
      <EditSection />
      <ImageSection />
      <OptionsSection />
      <ColorSection />
    </div>
  </div>
</template>

<style>
.drawer-backdrop {
  position: fixed;
  inset: 0 0 0 60px;
  z-index: 50;
  background: rgba(20, 28, 40, 0.25);
}
.drawer {
  height: 100%;
  width: min(320px, 100%);
  overflow-y: auto;
  background: var(--panel);
  border-right: 1px solid var(--border);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
}
.drawer .group {
  align-items: stretch;
  border-right: 0;
  border-bottom: 1px solid var(--border);
  padding: 10px 14px;
}
.drawer .group:last-child {
  border-bottom: 0;
}
.drawer .group-body {
  justify-content: flex-start;
}
.drawer .group-label {
  order: -1;
  text-align: left;
  font-weight: 600;
}
.drawer .group-body.options {
  align-items: stretch;
}
.drawer .size-wrap input[type='range'] {
  flex: 1;
}
.drawer .group-body.colors {
  flex-wrap: wrap;
}
.drawer .palette {
  grid-template-columns: repeat(7, 32px);
  gap: 6px;
}
.drawer .palette div {
  width: 32px;
  height: 32px;
}
</style>
