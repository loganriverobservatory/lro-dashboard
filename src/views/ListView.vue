<script setup lang="ts">
import { computed } from 'vue'
import StationCard from '../components/StationCard.vue'
import { type Station } from '../hydroService'

const props = defineProps<{
  sites: Station[]
  loading: boolean
}>()

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function isStationExpired(site: Station): boolean {
  if (!site || !site.observation) return true
  if (site.observation.result === -9999 || site.observation.result === null) return true
  if (!site.observation.phenomenonTime) return true

  const obsTime = new Date(site.observation.phenomenonTime).getTime()
  const cutoffTime = Date.now() - ONE_YEAR_MS

  return obsTime < cutoffTime
}

const activeSites = computed(() => {
  return props.sites.filter((site) => !isStationExpired(site))
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
      <StationCard v-for="site in activeSites" :key="site.uuid" :site="site" />
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
