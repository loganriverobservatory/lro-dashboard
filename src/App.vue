<script setup lang="ts">
/** * App.vue
 * Orchestrates global state, fetches data from HydroServer, and coordinates the visibility of different views.
 */
import { ref, onMounted } from 'vue'
import { getDischargeStations, getLatestObservation } from './hydroService'

// Import all your shiny new components!
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import HomeView from './views/HomeView.vue'
import ListView from './views/ListView.vue'
import MapView from './views/MapView.vue'
import SchematicView from './views/SchematicView.vue'

interface RiverStation {
  id: string
  displayName: string
  observation?: Record<string, unknown>
}

// Global State
const sites = ref<RiverStation[]>([])
const loading = ref(true)
const sidebarOpen = ref(false)
const currentView = ref('home')

// Global Data Fetching (Using the fixed Promise.all setup)
onMounted(async () => {
  try {
    const stations = await getDischargeStations()
    sites.value = stations

    await Promise.all(
      sites.value.map(async (site) => {
        try {
          const obs = await getLatestObservation(String(site.id))
          if (obs) site.observation = obs
        } catch {
          console.warn(`Failed: ${site.displayName}`)
        }
      }),
    )
  } catch (err) {
    console.error('Dashboard error:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="grid-container">
    <AppHeader @toggle-sidebar="sidebarOpen = true" @change-view="(view) => (currentView = view)" />

    <AppSidebar
      :is-open="sidebarOpen"
      :current-view="currentView"
      @close-sidebar="sidebarOpen = false"
      @change-view="(view) => (currentView = view)"
    />

    <main class="main-container">
      <HomeView v-if="currentView === 'home'" @change-view="(view) => (currentView = view)" />
      <ListView v-if="currentView === 'list'" :sites="sites" :loading="loading" />
      <MapView v-if="currentView === 'map'" />
      <SchematicView v-if="currentView === 'schematic'" />
    </main>
  </div>
</template>

<style>
/* Global resets and layout grid only */
body {
  margin: 0;
  font-family: sans-serif;
}

.grid-container {
  display: grid;
  grid-template-columns: 260px 1fr 1fr 1fr;
  grid-template-rows: 70px 1fr;
  grid-template-areas:
    'sidebar header header header'
    'sidebar main main main';
  height: 100vh;
}

.main-container {
  grid-area: main;
  background-color: #6376c1;
  padding: 2rem;
  overflow-y: auto;
}

@media screen and (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-areas: 'header' 'main';
  }
}
</style>
