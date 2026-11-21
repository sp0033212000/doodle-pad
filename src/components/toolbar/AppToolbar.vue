<script setup lang="ts">
import FileSection from './FileSection.vue';
import EditSection from './EditSection.vue';
import ImageSection from './ImageSection.vue';
import ToolsSection from './ToolsSection.vue';
import OptionsSection from './OptionsSection.vue';
import ColorSection from './ColorSection.vue';
</script>

<template>
  <div class="toolbar">
    <FileSection />
    <EditSection />
    <ImageSection />
    <ToolsSection />
    <OptionsSection />
    <ColorSection />
  </div>
</template>
