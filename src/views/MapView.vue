<script setup lang="ts">
/** * MapView.vue
 * Provides a dedicated space for the interactive map and geographic station visualization.
 */
import { Map as MapIcon } from 'lucide-vue-next'
</script>

<template>
  <div class="placeholder-view">
    <MapIcon :size="64" class="large-icon" />
    <h2>Map View</h2>
    <p>This section is ready for your map component.</p>
  </div>
</template>

<style scoped>
.placeholder-view {
  text-align: center;
  padding: 10rem 2rem;
  color: #f0f4f5;
}
.large-icon {
  margin-bottom: 1rem;
  opacity: 0.5;
}
</style>
