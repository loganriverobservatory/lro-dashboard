<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDischargeStations, getLatestObservation, type Station } from './hydroService' // 1. Imported the official type

import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import HomeView from './views/HomeView.vue'
import ListView from './views/ListView.vue'
import MapView from './views/MapView.vue'
import SchematicView from './views/SchematicView.vue'

// 2. Removed the local interface so it uses Brooke's updated Station type globally
const sites = ref<Station[]>([])
const loading = ref(true)
const sidebarOpen = ref(false)
const currentView = ref('home')
const selectedId = ref<string | null>(null)

// 3. Added the missing handleSelect handler for the map selection
function handleSelect(id: string | null) {
  selectedId.value = id
}

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
      <MapView
        v-if="currentView === 'map'"
        :sites="sites"
        :loading="loading"
        :selected-id="selectedId"
        @select="handleSelect"
      />
      <SchematicView v-if="currentView === 'schematic'" :sites="sites" :loading="loading" />
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
