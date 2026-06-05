<script setup lang="ts">
import { computed } from 'vue'
import StationCard from '../components/StationCard.vue'
import {
  type Station,
  WATER_VARIBALES,
  TRIBUTARY_COLORS,
  getFreshnessStatus,
  STATUS_COLORS,
} from '../hydroService'

const props = defineProps<{
  sites: Station[]
  loading: boolean
  selectedVariable?: string
  activeTributaries?: string[]
}>()

const variableLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match ? match.label : props.selectedVariable || 'Live Data'
})

const filteredSites = computed(() => {
  if (!props.activeTributaries || props.activeTributaries.length === 0) return props.sites
  return props.sites.filter((s) => props.activeTributaries!.includes(s.tributary ?? ''))
})

function getStationStatusColor(station: Station): string {
  if (!station.observation) return STATUS_COLORS.unknown
  const status = getFreshnessStatus(station.observation)
  return STATUS_COLORS[status]
}
</script>

<template>
  <div class="container">
    <header class="dashboard-header">
      <h1>Logan River Observatory</h1>
      <div class="status-banner">
        <h2>Live {{ variableLabel }} Monitoring</h2>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Connecting to river sensors...</p>
    </div>

    <div v-else class="station-grid">
      <StationCard v-for="site in filteredSites" :key="site.uuid" :site="site" />
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
