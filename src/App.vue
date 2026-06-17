<script setup lang="ts">
/*
App.vue - root orchestrator
*/
import { ref, onMounted } from 'vue'
import {
  getVariableStations,
  getLatestObservation,
  type Station,
  WATERWAY_LIST,
} from './hydroService'
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
const activeWaterways = ref<string[]>([...WATERWAY_LIST])

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

function handleWaterwayFilter(updated: string[]) {
  activeWaterways.value = updated
}

onMounted(() => loadStations(selectedVariable.value))
</script>

<template>
  <div class="grid-container">
    <AppHeader @toggle-sidebar="sidebarOpen = true" @change-view="(view) => (currentView = view)" />

    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />

    <AppSidebar
      :is-open="sidebarOpen"
      :current-view="currentView"
      :active-waterways="activeWaterways"
      @close-sidebar="sidebarOpen = false"
      @change-view="(view) => (currentView = view)"
      @variable-changed="handleVariableChange"
      @waterway-filter-changed="handleWaterwayFilter"
    />

    <main class="main-container">
      <HomeView v-if="currentView === 'home'" @change-view="(view) => (currentView = view)" />
      <HelpView v-if="currentView === 'help'" />
      <ListView
        v-if="currentView === 'list'"
        :sites="sites"
        :loading="loading"
        :selected-variable="selectedVariable"
        :active-waterways="activeWaterways"
      />
      <MapView
        v-if="currentView === 'map'"
        :sites="sites"
        :loading="loading"
        :selected-id="selectedId"
        :selected-variable="selectedVariable"
        :active-waterways="activeWaterways"
        @select="handleSelect"
        @resetWaterways="(allWaterWays) => (activeWaterways = allWaterWays)"
      />
      <SchematicView
        v-if="currentView === 'schematic'"
        :sites="sites"
        :loading="loading"
        :active-waterways="activeWaterways"
      />
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
  background-color: #f8fafc;
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

.sidebar-backdrop {
  display: none;
}

@media screen and (max-width: 992px) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 999;
  }
}
</style>
