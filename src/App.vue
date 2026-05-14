<script setup lang="ts">
import { ref, onMounted } from 'vue'
// 1. Import the logic from your service file
import { getDischargeStations, getLatestObservation } from './hydroService'
// 2. Import your new UI component
import StationCard from './components/StationCard.vue'

// Define our reactive state
const sites = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    console.log('Dashboard: Requesting stations from service...')

    // 3. Get the list of stations (The 'List' step)
    const stations = await getDischargeStations()
    sites.value = stations

    // 4. Get the latest reading for each (The 'Pop-in' step)
    sites.value.forEach(async (site, index) => {
      try {
        const obs = await getLatestObservation(site.id)
        if (obs) {
          sites.value[index].observation = obs
        }
      } catch (err) {
        console.warn(`Failed to fetch data for station: ${site.displayName}`)
      }
    })
  } catch (err) {
    console.error('Dashboard error:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <header>
      <h1>Logan River Observatory</h1>
      <div class="status-banner">
        <h2>Live Discharge Monitoring (cfs)</h2>
      </div>
    </header>

    <main>
      <div v-if="loading" class="loading-state">
        <p>Connecting to river sensors...</p>
      </div>

      <div v-else class="station-grid">
        <StationCard v-for="site in sites" :key="site.id" :site="site" />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Only keep the general layout CSS here */
.container {
  font-family:
    'Inter',
    -apple-system,
    sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f8fafc;
  min-height: 100vh;
}

header h1 {
  color: #0f172a;
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  letter-spacing: -0.025em;
}

.status-banner {
  background: #e0f2fe;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  border-left: 5px solid #0ea5e9;
  margin-bottom: 2.5rem;
}

.status-banner h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0369a1;
  font-weight: 600;
}

.station-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading-state {
  text-align: center;
  padding: 5rem;
  color: #64748b;
  font-size: 1.2rem;
}
</style>
