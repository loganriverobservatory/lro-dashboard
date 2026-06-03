<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getVariableStations, getLatestObservation, type Station } from './hydroService'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import HomeView from './views/HomeView.vue'
import HelpView from './views/HelpView.vue'
import ListView from './views/ListView.vue'
import MapView from './views/MapView.vue'
import SchematicView from './views/SchematicView.vue'

const sites = ref<Station[]>([])
const loading = ref(true)
const sidebarOpen = ref(false)
const currentView = ref('home')
const selectedId = ref<string | null>(null)
const selectedVariable = ref('Discharge')

function handleSelect(id: string | null) {
  selectedId.value = id
}

async function loadStations(variable: string) {
  loading.value = true
  sites.value = []
  try {
    const stations = await getVariableStations(variable)
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
}

function handleVariableChange(variable: string) {
  selectedVariable.value = variable
  loadStations(variable)
}

onMounted(() => loadStations(selectedVariable.value))
</script>

<template>
  <div class="grid-container">
    <AppHeader @toggle-sidebar="sidebarOpen = true" @change-view="(view) => (currentView = view)" />

    <AppSidebar
      :is-open="sidebarOpen"
      :current-view="currentView"
      @close-sidebar="sidebarOpen = false"
      @change-view="
        (view) => {
          currentView = view
          sidebarOpen = false
        }
      "
      @variable-changed="handleVariableChange"
    />

    <main class="main-container">
      <HomeView v-if="currentView === 'home'" @change-view="(view) => (currentView = view)" />
      <HelpView v-if="currentView === 'help'" />
      <ListView
        v-if="currentView === 'list'"
        :sites="sites"
        :loading="loading"
        :selected-variable="selectedVariable"
      />
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
body {
  margin: 0;
  font-family: sans-serif;
  overflow: hidden;
}

.grid-container {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: 70px 1fr;
  grid-template-areas:
    'sidebar header header header'
    'sidebar main main main';
  height: 100vh;
}

.main-container {
  grid-area: main;
  background-color: #f8fafc; /* Changed from #6376c1 to crisp modern off-white */
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

@media screen and (max-width: 992px) {
  .grid-container {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'header' 'main';
  }
}
</style>
