<script setup lang="ts">
/*
App.vue - root orchestrator
*/
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getVariableStations,
  getLatestObservation,
  getUSGSStations,
  getDWRiStations,
  setApiToken,
  loadStationConfig,
  loadSchematicPages,
  type Station,
  type SchematicPages,
  WATERWAY_LIST,
} from './hydroService'
import hsLogo from './assets/hydroserver-icon.png'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import HomeView from './views/HomeView.vue'
import HelpView from './views/HelpView.vue'
import ListView from './views/ListView.vue'
import MapView from './views/MapView.vue'

const route = useRoute()
const router = useRouter()
const isSchematicRoute = computed(() => route.path.startsWith('/schematic/'))

const sites = ref<Station[]>([])
const loading = ref(true)
const sidebarOpen = ref(false)
const currentView = ref('home')
const selectedId = ref<string | null>(null)
const selectedVariable = ref('Discharge')
const activeWaterways = ref<string[]>([])
const schematicPages = ref<SchematicPages | null>(null)

let refreshTimer: ReturnType<typeof setInterval> | null = null

function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(async () => { await loadConfig(); loadStations(selectedVariable.value) }, 20 * 60 * 1000)
}

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

function handleSelect(id: string | null) {
  selectedId.value = id
}

async function loadConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-cache' })
    if (res.ok) {
      const config = await res.json()
      if (config.apiToken) setApiToken(config.apiToken)
    }
  } catch {
    // proceed without config
  }

  await loadStationConfig()
  schematicPages.value = await loadSchematicPages()
  if (activeWaterways.value.length === 0) activeWaterways.value = [...WATERWAY_LIST]
}

async function loadStations(variable: string) {
  loading.value = true
  sites.value = []
  try {
    const [stations, usgsStations, dwriStations] = await Promise.all([
      getVariableStations(variable),
      getUSGSStations(variable),
      getDWRiStations(variable),
    ])

    const allStations = [...stations, ...usgsStations, ...dwriStations]

    // Show station list immediately so cards render with "Updating..." spinner
    sites.value = allStations
    loading.value = false

    // Load observations for HydroServer stations; USGS stations come pre-filled.
    // Fired in parallel (not awaited one at a time) since each request is independent —
    // getLatestObservation already swallows its own errors, so one station failing never
    // blocks or delays the rest.
    await Promise.all(
      allStations.map(async (station, i) => {
        if (station.isUSGS || station.isDWRi) return
        try {
          const telemetry = await getLatestObservation(station.id, station.latestTime)
          sites.value[i] = { ...station, observation: telemetry }
        } catch {
          // leave observation null
        }
      }),
    )
  } catch (err) {
    console.error('Fatal dashboard orchestrator error:', err)
    loading.value = false
  }
}

function handleVariableChange(variable: string) {
  selectedVariable.value = variable
  loadStations(variable)
  scheduleRefresh()
}

function handleWaterwayFilter(updated: string[]) {
  activeWaterways.value = updated
}

// Home/List/Map/Help nav clicks route through here so leaving a /schematic/*
// route resets the URL back to '/' — otherwise the address bar would stay on
// a schematic sub-route while a non-schematic view is showing.
function changeView(view: string) {
  currentView.value = view
  if (isSchematicRoute.value) router.push('/')
}

onMounted(async () => {
  await loadConfig()
  loadStations(selectedVariable.value)
  scheduleRefresh()
})
</script>

<template>
  <div class="grid-container">
    <AppHeader @toggle-sidebar="sidebarOpen = true" @change-view="changeView" />

    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />

    <AppSidebar
      :is-open="sidebarOpen"
      :current-view="currentView"
      :active-waterways="activeWaterways"
      @close-sidebar="sidebarOpen = false"
      @change-view="changeView"
      @variable-changed="handleVariableChange"
      @waterway-filter-changed="handleWaterwayFilter"
    />

    <main class="main-container">
      <template v-if="isSchematicRoute">
        <router-view v-slot="{ Component }">
          <component :is="Component" :sites="sites" :loading="loading" :active-waterways="activeWaterways" />
        </router-view>
      </template>
      <template v-else>
        <HomeView v-if="currentView === 'home'" @change-view="changeView" />
        <HelpView v-if="currentView === 'help'" />
        <ListView
          v-if="currentView === 'list'"
          :sites="sites"
          :loading="loading"
          :selected-variable="selectedVariable"
          :active-waterways="activeWaterways"
          :schematic-pages="schematicPages"
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
      </template>
    </main>
  </div>

  <a
    href="https://hydroserver.org"
    target="_blank"
    rel="noopener noreferrer"
    class="hs-badge"
    title="Powered by HydroServer"
  >
    <img :src="hsLogo" alt="HydroServer" class="hs-badge-icon" />
    <span class="hs-badge-text">Powered by HydroServer</span>
  </a>
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

.hs-badge {
  position: fixed;
  bottom: 10px;
  right: 14px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px 4px 6px;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
  opacity: 0.8;
}

.hs-badge:hover {
  opacity: 1;
  background: rgba(15, 23, 42, 0.9);
}

.hs-badge-icon {
  height: 13px;
  width: auto;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

@media screen and (max-width: 992px) {
  .hs-badge-text {
    display: none;
  }
  .hs-badge {
    padding: 5px 7px;
  }
  .hs-badge-icon {
    height: 15px;
  }
}
</style>
