<script setup lang="ts">
/*
App.vue - root orchestrator
*/
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getVariableStations,
  getLatestObservation,
  getUSGSStations,
  getDWRiStations,
  setApiToken,
  setApiConfig,
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

// Keeps currentView synced to the route itself, rather than relying on every possible way of
// navigating to a schematic page (sidebar's submenu, its own tab bar, a node's "view full
// system" button, a direct URL, browser back/forward) to remember to update it individually.
// Without this, AppSidebar's own direct router.push() calls left currentView stuck on
// whatever view was active before - keeping List/Map's sidebar item highlighted and the
// FILTER STATIONS section visible even after navigating away to a schematic page.
watch(isSchematicRoute, (isSchematic) => {
  if (isSchematic) currentView.value = 'schematic'
})
const selectedId = ref<string | null>(null)
const selectedVariable = ref('Discharge')
const activeWaterways = ref<string[]>([])
// Which schematic systems (Upper Logan, Little Bear, etc.) are active in List/Map view's
// system filter - shared between both views, same pattern as activeWaterways.
const activeSystems = ref<string[]>([])
// Only one of activeSystems/activeWaterways is ever actually applied as a filter, chosen by
// this mode - see setFilterMode(). Keeps List/Map view's filter to one dimension at a time
// instead of the two stacking, which is simpler to reason about for a public-facing dashboard.
const filterMode = ref<'system' | 'source'>('system')
const schematicPages = ref<SchematicPages | null>(null)

// Branding, cosmetic only - unlike the API endpoints in setApiConfig(), a missing value here
// just means AppHeader falls back to its own default text rather than failing to start.
const dashboardTitle = ref<string | undefined>(undefined)
const headerNav = ref<{ home?: string; help?: string }>({})
const externalLink = ref<{ url?: string; label?: string }>({})

// Manifest-ordered {slug, label} list for the sidebar submenu and the schematic tab bar - the
// single place that derives a displayable nav list from schematicPages, so neither component
// needs its own hardcoded copy of which systems exist.
const schematicNav = computed(() => {
  if (!schematicPages.value) return []
  return schematicPages.value.slugs.flatMap((slug) => {
    const page = schematicPages.value!.bySlug[slug]
    return page ? [{ slug, label: page.navLabel ?? page.title }] : []
  })
})

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
  // Network-level failure only (e.g. a transient outage during the 20-minute refresh) is
  // tolerated here - config stays null and this cycle just skips re-applying it. That's
  // different from config.json being reachable but missing/mistyping a required endpoint,
  // which is NOT caught here - setApiConfig() below throws in that case, on purpose (see its
  // own comment in hydroService.ts).
  let config: Record<string, unknown> | null = null
  try {
    const res = await fetch('/config.json', { cache: 'no-cache' })
    if (res.ok) config = await res.json()
  } catch {
    // proceed without a freshly-fetched config this cycle
  }

  if (config) {
    if (config.apiToken) setApiToken(config.apiToken as string)
    setApiConfig({
      hydroServerBaseUrl: config.hydroServerBaseUrl,
      stationConfigUrl: config.stationConfigUrl,
      usgsApiBaseUrl: config.usgsApiBaseUrl,
    })
    dashboardTitle.value = typeof config.dashboardTitle === 'string' ? config.dashboardTitle : undefined
    headerNav.value = (config.headerNav as typeof headerNav.value) ?? {}
    externalLink.value = (config.externalLink as typeof externalLink.value) ?? {}
    if (dashboardTitle.value) document.title = dashboardTitle.value
  }

  await loadStationConfig()
  schematicPages.value = await loadSchematicPages()
  if (activeWaterways.value.length === 0) activeWaterways.value = [...WATERWAY_LIST]
  if (activeSystems.value.length === 0) activeSystems.value = schematicNav.value.map((s) => s.slug)
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

function handleSystemFilter(updated: string[]) {
  activeSystems.value = updated
}

// Switching modes always resets the newly-active mode's checkboxes to fully-checked, rather
// than resuming wherever they were left last time - a stale partial selection from an earlier
// visit to this mode would be confusing to land on. The mode you're leaving keeps its own
// stored checkboxes, but List/Map view ignores them entirely while inactive (see filterMode).
function setFilterMode(mode: 'system' | 'source') {
  filterMode.value = mode
  if (mode === 'system') activeSystems.value = schematicNav.value.map((s) => s.slug)
  else activeWaterways.value = [...WATERWAY_LIST]
}

// Home/List/Map/Help nav clicks route through here so leaving a /schematic/*
// route resets the URL back to '/' — otherwise the address bar would stay on
// a schematic sub-route while a non-schematic view is showing. Clicking into
// 'schematic' (e.g. the Home page's card) instead pushes straight to the first
// manifest-ordered slug, same as the sidebar's "SCHEMATIC VIEW" item.
function changeView(view: string) {
  currentView.value = view
  if (view === 'schematic') {
    if (!isSchematicRoute.value && schematicNav.value.length) {
      router.push(`/schematic/${schematicNav.value[0]!.slug}`)
    }
    return
  }
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
    <AppHeader
      :dashboard-title="dashboardTitle"
      :header-nav="headerNav"
      :external-link="externalLink"
      @toggle-sidebar="sidebarOpen = true"
      @change-view="changeView"
    />

    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />

    <AppSidebar
      :is-open="sidebarOpen"
      :current-view="currentView"
      :active-waterways="activeWaterways"
      :active-systems="activeSystems"
      :filter-mode="filterMode"
      :schematic-nav="schematicNav"
      @close-sidebar="sidebarOpen = false"
      @change-view="changeView"
      @variable-changed="handleVariableChange"
      @waterway-filter-changed="handleWaterwayFilter"
      @system-filter-changed="handleSystemFilter"
      @filter-mode-changed="setFilterMode"
    />

    <main class="main-container">
      <template v-if="isSchematicRoute">
        <router-view v-slot="{ Component }">
          <component
            :is="Component"
            :sites="sites"
            :loading="loading"
            :active-waterways="activeWaterways"
            :schematic-nav="schematicNav"
            :selected-variable="selectedVariable"
          />
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
          :active-systems="activeSystems"
          :filter-mode="filterMode"
          :schematic-pages="schematicPages"
          :schematic-nav="schematicNav"
          @system-filter-changed="handleSystemFilter"
          @waterway-filter-changed="handleWaterwayFilter"
          @filter-mode-changed="setFilterMode"
        />
        <MapView
          v-if="currentView === 'map'"
          :sites="sites"
          :loading="loading"
          :selected-id="selectedId"
          :selected-variable="selectedVariable"
          :active-waterways="activeWaterways"
          :active-systems="activeSystems"
          :filter-mode="filterMode"
          :schematic-pages="schematicPages"
          :schematic-nav="schematicNav"
          @select="handleSelect"
          @resetWaterways="(allWaterWays) => (activeWaterways = allWaterWays)"
          @system-filter-changed="handleSystemFilter"
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
