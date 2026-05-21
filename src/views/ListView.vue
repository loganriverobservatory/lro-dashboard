<script setup lang="ts">
/** * ListView.vue
 * Renders a collection of station cards to provide a comprehensive overview of all active sensor readings.
 */
import { computed } from 'vue'
import StationCard from '../components/StationCard.vue'
import { type Station, isStationActive } from '../hydroService'

// Access props sent from App.vue
const props = defineProps<{
  sites: Station[]
  loading: boolean
}>()

//Filter active sites
const activeSites = computed(() => {
  return props.sites.filter((site) => isStationActive(site.observation))
})
</script>

<template>
  <div class="container">
    <header class="dashboard-header">
      <h1>Logan River Observatory</h1>
      <div class="status-banner">
        <h2>Live Discharge Monitoring (cfs)</h2>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Connecting to river sensors...</p>
    </div>

    <div v-else class="station-grid">
      <StationCard v-for="site in activeSites" :key="site.id" :site="site" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #a4bbd1;
  border-radius: 12px;
}

.dashboard-header h1 {
  color: #2f3c4d;
}

.status-banner {
  background-color: #e0f2fe;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-banner h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0369a1;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-style: italic;
}

.station-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
