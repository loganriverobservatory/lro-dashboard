<script setup lang="ts">
/** * App.vue
 * Orchestrates global state, fetches data from HydroServer, and coordinates the visibility of different views.
 */

import { ref, onMounted } from 'vue'
import { getDischargeStations, getLatestObservation, type Station } from './hydroService'

// Component Imports
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import HomeView from './views/HomeView.vue'
import ListView from './views/ListView.vue'
import MapView from './views/MapView.vue'
import SchematicView from './views/SchematicView.vue'

// Reactive State
const sites = ref<Station[]>([])
const loading = ref(true)
const sidebarOpen = ref(false)
const currentView = ref('home')
const selectedId = ref<string | null>(null)

const handleSelect = (id: string) => {
  console.log('Station selected:', id)
  selectedId.value = id
}

// Global Data Fetching
onMounted(async () => {
  try {
    loading.value = true
    // Get station data
    const data = await getDischargeStations()
    sites.value = data

    //get water levels
    for (const site of sites.value) {
      const obs = await getLatestObservation(site.id)
      site.observation = obs
    }
    // Trigger the map once all the data is in
    sites.value = [...sites.value]
  } catch (error) {
    console.error('Failed to load stations:', error)
  } finally {
    // This runs whether the fetch succeeded or failed, stopping the spinner
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
      <MapView
        v-if="currentView === 'map'"
        :sites="sites"
        :selected-id="selectedId"
        @select="handleSelect"
      />
      <SchematicView v-if="currentView === 'schematic'" />
    </main>
  </div>
</template>

<style>
/* Global resets and layout grid */
body {
  margin: 0;
  font-family: sans-serif;
}

.grid-container {
  display: grid;
  grid-template-columns: 260px 1fr; /* Simplified columns */
  grid-template-rows: 70px 1fr;
  grid-template-areas:
    'sidebar header'
    'sidebar main';
  height: 100vh;
}

.main-container {
  grid-area: main;
  background-color: #6376c1;
  padding: 2rem;
  overflow-y: auto;
}

/* Mobile Responsiveness */
@media screen and (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-areas: 'header' 'main';
  }
}
</style>
