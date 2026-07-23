<script setup lang="ts">
/*
MapView.vue - Displays the map with station pins and station cards in popups. Pins are colored by waterway and show variable values when zoomed in.
*/
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, watch, onBeforeUnmount, ref, computed } from 'vue'
import {
  type Station,
  type SchematicPages,
  getFreshnessStatus,
  getSchematicSystemOrder,
  findStationSystem,
  STATUS_COLORS,
  WATERWAY_COLORS,
  WATERWAY_LIST,
  WATER_VARIBALES,
} from '../hydroService'
import StationCard from '../components/StationCard.vue'

const props = defineProps<{
  sites: Station[]
  loading: boolean
  selectedId: string | null
  selectedVariable: string
  activeWaterways: string[]
  // Which schematic systems are active in the filter below - see App.vue's activeSystems.
  activeSystems?: string[]
  // Which of activeSystems/activeWaterways is currently applied - see App.vue's filterMode.
  // Only one is ever actually filtered on, regardless of the other's stored checkbox state.
  filterMode?: 'system' | 'source'
  schematicPages?: SchematicPages | null
  // Manifest-ordered {slug, label} list - used by resetMap() to restore every system on reset.
  // No mobile filter UI here - MapView relies entirely on the sidebar's own FILTER STATIONS
  // toggle, on mobile and desktop alike (see AppSidebar.vue).
  schematicNav?: { slug: string; label: string }[]
}>()

const emit = defineEmits<{
  (e: 'resetWaterways', fallbackWaterways: string[]): void
  (e: 'system-filter-changed', updated: string[]): void
}>()

// Same schematic data as the schematic pages themselves, but keeping each station's system
// slug - used to filter map pins by system, same matching rule ListView uses.
const systemOrder = computed(() => getSchematicSystemOrder(props.schematicPages))

const variableLongLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match?.longLabel ?? props.selectedVariable
})

let map: L.Map | null = null
const markerMap = new Map<string, L.Marker>()
const hasZoomed = ref(false)
const expandedStation = ref<Station | null>(null)
let isProgrammaticZoom = false

// Rebuilds every Leaflet marker from scratch (rather than diffing) - simplest way to keep pins
// in sync with sites/activeWaterways changes, and cheap enough at this station count. Also
// re-fits the map to all visible pins, but only before the user's first manual zoom (see
// hasZoomed), so it doesn't fight a zoom/pan the user just did.
const syncMarkers = () => {
  if (!map) return

  markerMap.forEach((m) => m.remove())
  markerMap.clear()

  const allCoords: L.LatLngTuple[] = []

  props.sites.forEach((station: Station) => {
    if (props.filterMode === 'source') {
      if (!props.activeWaterways.includes(station.tributary ?? '')) return
    } else if (props.activeSystems) {
      // A station that doesn't match any schematic file is treated as belonging to no
      // system, so it's hidden the same as anything else once its (nonexistent) system is
      // deselected - add it to a schematic JSON to make it filterable.
      const system = findStationSystem(station.displayName, systemOrder.value)
      if (system === undefined || !props.activeSystems.includes(system)) return
    }
    if (station.coordinates && station.coordinates.length === 2) {
      const coords = station.coordinates as L.LatLngTuple
      allCoords.push(coords)

      const hasData =
        station.observation?.result !== null && station.observation?.result !== undefined
      const tributaryColor = WATERWAY_COLORS[station.tributary ?? ''] ?? '#ef4444'
      const pinColor = hasData ? tributaryColor : '#94a3b8'
      const strokeColor = hasData ? tributaryColor : '#475569'

      const pinSvg = `
        <svg viewBox="0 0 24 24" width="22" height="28">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${pinColor}" stroke="${strokeColor}" stroke-width="1"/>
          <circle cx="12" cy="9" r="3" fill="white"/>
        </svg>`

      const dynamicPin = L.divIcon({
        className: 'custom-pin',
        html: pinSvg,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      })

      const marker = L.marker(coords, { icon: dynamicPin }).addTo(map!)

      if (hasZoomed.value) {
        const obs = station.observation
        let valueStr = 'n/a'
        let color = STATUS_COLORS.unknown

        if (obs && obs.result !== null && obs.result !== undefined) {
          valueStr = `${Number(obs.result).toFixed(2)}`
          const status = getFreshnessStatus(obs)
          color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unknown
        }

        marker.bindTooltip(`<div class="pin-value" style="color:${color}">${valueStr}</div>`, {
          permanent: true,
          direction: 'top',
          offset: [0, -20],
          className: 'value-tooltip',
          interactive: true,
        })

        marker.on('click', () => {
          expandedStation.value = station
          if (map) map.panTo(coords)
        })
      }

      markerMap.set(station.uuid, marker)
    }
  })

  if (!hasZoomed.value && allCoords.length > 0) {
    isProgrammaticZoom = true
    const bounds = L.latLngBounds(allCoords)
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

// The "Reset" button shown once the user has zoomed in - clears the manual-zoom flag, restores
// every waterway and system to the active filter set, and re-fits the map to all sites.
function resetMap() {
  hasZoomed.value = false
  expandedStation.value = null
  emit('resetWaterways', [...WATERWAY_LIST])
  if (props.schematicNav?.length)
    emit(
      'system-filter-changed',
      props.schematicNav.map((s) => s.slug),
    )
  syncMarkers()

  const coords = props.sites
    .filter((s) => s.coordinates?.length === 2)
    .map((s) => s.coordinates as L.LatLngTuple)
  if (coords.length > 0 && map) {
    isProgrammaticZoom = true
    map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] })
  }
}

onMounted(() => {
  map = L.map('map-div', {
    center: [41.737, -111.83],
    zoom: 12,
  })

  map.zoomControl.setPosition('topright')

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  map.on('zoomend', () => {
    if (isProgrammaticZoom) {
      isProgrammaticZoom = false
      return
    }
    if (!hasZoomed.value) {
      hasZoomed.value = true
      syncMarkers()
    }
  })

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
      syncMarkers()
    }
  }, 250)
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// Refreshes markers as new observations arrive, and keeps an open station popup showing
// current data (or closes it if that station disappeared, e.g. a waterway filter change).
watch(
  () => props.sites,
  () => {
    if (expandedStation.value) {
      const updated = props.sites.find((s) => s.uuid === expandedStation.value!.uuid)
      expandedStation.value = updated ?? null
    }
    syncMarkers()
  },
  { deep: true },
)

// Closes the open station popup if its waterway just got filtered out (only when that filter
// is actually the active one - see filterMode), then re-syncs pins.
watch(
  () => props.activeWaterways,
  () => {
    if (
      props.filterMode === 'source' &&
      expandedStation.value &&
      !props.activeWaterways.includes(expandedStation.value.tributary ?? '')
    ) {
      expandedStation.value = null
    }
    syncMarkers()
  },
  { deep: true },
)

// Same as above, for the system filter - closes the popup if its system just got turned off.
watch(
  () => props.activeSystems,
  () => {
    if (props.filterMode !== 'source' && expandedStation.value && props.activeSystems) {
      const system = findStationSystem(expandedStation.value.displayName, systemOrder.value)
      if (system === undefined || !props.activeSystems.includes(system)) {
        expandedStation.value = null
      }
    }
    syncMarkers()
  },
  { deep: true },
)

// Switching modes changes which stations are actually filtered, without activeWaterways or
// activeSystems themselves necessarily changing - re-sync so pins reflect the new mode.
watch(() => props.filterMode, syncMarkers)

// Selecting a station elsewhere in the app (e.g. from a list) pans the map to and opens its pin.
watch(
  () => props.selectedId,
  (newId) => {
    if (newId && markerMap.has(newId) && map) {
      const marker = markerMap.get(newId)
      if (marker) {
        marker.openPopup()
        map.panTo(marker.getLatLng())
      }
    }
  },
)
</script>

<template>
  <div class="map-container">
    <div id="map-div"></div>

    <div v-if="loading" class="map-loading-overlay">
      <div class="spinner"></div>
      <p>Loading stations…</p>
    </div>

    <div v-if="!hasZoomed" class="map-banner">
      <div class="banner-live-label">Live {{ variableLongLabel }}</div>
      <span class="banner-instructions">
        Zoom in/out to see <strong>{{ selectedVariable }}</strong> values. Click on values for more
        information.
      </span>
    </div>

    <button v-if="hasZoomed" class="reset-btn" @click="resetMap">Reset</button>

    <div v-if="expandedStation" class="expanded-overlay">
      <div class="expanded-card-wrapper">
        <button class="close-btn" @click="expandedStation = null">✕</button>
        <StationCard :site="expandedStation" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  border-top: 1px solid #ccc;
  overflow: hidden;
}
#map-div {
  flex-grow: 1;
  height: 100%;
  background: #f8f9fa;
}
:deep(.custom-pin) {
  background: transparent;
  border: none;
}
:deep(.leaflet-control-container) {
  z-index: 800;
}

.map-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 950;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: rgba(248, 250, 252, 0.85);
  color: #64748b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #01377d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.map-banner {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 900;
  background: rgba(254, 226, 226, 0.95);
  border: 1px solid #fca5a5;
  border-radius: 10px;
  padding: 16px 22px;
  font-size: 1.15rem;
  color: #7f1d1d;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  max-width: min(370px, calc(100vw - 24px));
  pointer-events: none;
}
.banner-live-label {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 6px;
}

/* Same 768px mobile threshold used elsewhere in the app. The banner shrinks and drops its
   instructional text (kept full-size in .map-banner above) so it no longer reaches wide
   enough to overlap the zoom control Leaflet renders in the top-right corner. */
@media screen and (max-width: 768px) {
  .map-banner {
    padding: 8px 12px;
    font-size: 0.85rem;
    max-width: calc(100vw - 96px);
  }
  .banner-live-label {
    font-size: 0.8rem;
    margin-bottom: 0;
  }
  .banner-instructions {
    display: none;
  }
}
.reset-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 900;
  background: #073763;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 14px 28px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.reset-btn:hover {
  background: #073763;
}

.expanded-overlay {
  position: absolute;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
}
.expanded-card-wrapper {
  position: relative;
  width: min(360px, calc(100vw - 32px));
  max-height: 80vh;
  overflow-y: auto;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background: #f1f5f9;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
}
.close-btn:hover {
  background: #e2e8f0;
}
.expanded-card-wrapper :deep(.card-flex-layout) {
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}
.expanded-card-wrapper :deep(.sparkline-sidebar-wrapper) {
  width: 100%;
}
.expanded-card-wrapper :deep(.sparkline-title) {
  text-align: left;
}
.expanded-card-wrapper :deep(.sparkline-sidebar-wrapper .cursor-pointer) {
  height: auto !important;
  aspect-ratio: 9 / 4;
}

:deep(.value-tooltip) {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12) !important;
  padding: 1px 4px !important;
  border-radius: 4px !important;
  cursor: pointer;
}
:deep(.value-tooltip::before) {
  display: none !important;
}
:deep(.pin-value) {
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
}

@media screen and (max-width: 480px) {
  :deep(.pin-value) {
    font-size: 0.7rem;
  }
  :deep(.value-tooltip) {
    padding: 1px 3px !important;
  }
}
</style>
