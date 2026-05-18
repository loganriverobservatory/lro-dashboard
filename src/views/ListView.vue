<script setup lang="ts">
/** * ListView.vue
 * Renders a collection of station cards to provide a comprehensive overview of all active sensor readings.
 */
import { computed } from 'vue'
import StationCard from '../components/StationCard.vue'
import { isStationActive } from '../hydroService'

interface RiverSite {
  id: string
  displayName: string
  observation?: any
}

// Keep Brooke's setup receiving the raw sites from the parent
const props = defineProps<{
  sites: RiverSite[]
  loading: boolean
}>()

// FILTER: Dynamically filter out any sites that are not live/active
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
  background-color: #f8fafc;
  border-radius: 12px;
}
.dashboard-header h1 {
  color: #334155;
}
.status-banner {
  background-color: #e0f2fe;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.loading-state {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #64748b;
}
.station-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>
