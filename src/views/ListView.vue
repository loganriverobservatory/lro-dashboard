<script setup lang="ts">
/*
ListView.vue - Displays a list of station cards with variable values and freshness status
*/
import { computed } from 'vue'
import StationCard from '../components/StationCard.vue'
import { type Station, WATER_VARIBALES } from '../hydroService'

const props = defineProps<{
  sites: Station[]
  loading: boolean
  selectedVariable?: string
  activeWaterways?: string[]
}>()

const variableLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match ? match.label : props.selectedVariable || 'Live Data'
})

const variableLongLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match?.longLabel ?? variableLabel.value
})

const filteredSites = computed(() => {
  if (!props.activeWaterways) return props.sites
  return props.sites.filter((s) => props.activeWaterways!.includes(s.tributary ?? ''))
})
</script>

<template>
  <div class="container">
    <header class="dashboard-header">
      <div class="status-banner">
        <h2>Live {{ variableLongLabel }}</h2>
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

.status-banner h2 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

@media screen and (max-width: 480px) {
  .status-banner h2 {
    font-size: 0.8rem;
  }
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
@media screen and (max-width: 480px) {
  .container {
    padding: 1rem;
  }
}
@media screen and (max-width: 375px) {
  :deep(.card-flex-layout) {
    flex-direction: column;
    align-items: stretch;
  }
  :deep(.sparkline-sidebar-wrapper) {
    width: 80%;
  }
  :deep(.sparkline-title) {
    text-align: left;
  }
}
</style>
