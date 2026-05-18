<script setup lang="ts">
/** * HomeView.vue
 * Serves as the landing page with a hero section and quick-access links for the general public.
 */
import { Droplets, List, Map as MapIcon } from 'lucide-vue-next'

const emit = defineEmits(['change-view'])
</script>

<template>
  <div class="home-page">
    <div class="hero-section">
      <Droplets :size="80" class="hero-logo" />
      <h1>Logan River Observatory</h1>
      <p>Real-time hydrologic monitoring and data visualization dashboard.</p>

      <div class="home-cards">
        <div class="action-card" @click="emit('change-view', 'list')">
          <List :size="32" />
          <h3>Station List</h3>
          <p>View live discharge and sensor data.</p>
        </div>
        <div class="action-card" @click="emit('change-view', 'map')">
          <MapIcon :size="32" />
          <h3>Interactive Map</h3>
          <p>Locate stations along the river corridor.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  text-align: center;
  color: white;
}
.hero-logo {
  color: #38bdf8;
  margin-bottom: 1.5rem;
}
.home-cards {
  display: flex;
  gap: 20px;
  margin-top: 3rem;
  justify-content: center;
}
.action-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 12px;
  width: 250px;
  cursor: pointer;
  transition:
    transform 0.2s,
    background 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.action-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.2);
  border-color: #38bdf8;
}
</style>
