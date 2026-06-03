<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, watch, onBeforeUnmount, ref } from 'vue'
import { type Station, getFreshnessStatus, TRIBUTARY_COLORS } from '../hydroService'
import StationCard from '../components/StationCard.vue'

const props = defineProps<{
  sites: Station[]
  selectedId: string | null
  selectedVariable: string
  activeTributaries: string[]
}>()

const emit = defineEmits(['select'])

let map: L.Map | null = null
const markerMap = new Map<string, L.Marker>()
const hasZoomed = ref(false)
const expandedStation = ref<Station | null>(null)
let isProgrammaticZoom = false

const statusColorMap: Record<string, string> = {
  current: '#16a34a',
  stale: '#d97706',
  outdated: '#64748b',
  unknown: '#64748b',
}

const syncMarkers = () => {
  if (!map) return

  markerMap.forEach((m) => m.remove())
  markerMap.clear()

  const allCoords: L.LatLngTuple[] = []

  props.sites.forEach((station: Station) => {
    if (!props.activeTributaries.includes(station.tributary ?? '')) return
    if (station.coordinates && station.coordinates.length === 2) {
      const coords = station.coordinates as L.LatLngTuple
      allCoords.push(coords)

      const hasData =
        station.observation?.result !== null && station.observation?.result !== undefined
      const tributaryColor = TRIBUTARY_COLORS[station.tributary ?? ''] ?? '#ef4444'
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
        let color = statusColorMap.unknown

        if (obs && obs.result !== null && obs.result !== undefined) {
          valueStr = `${Number(obs.result).toFixed(2)} ${station.unit || ''}`
          const status = getFreshnessStatus(obs)
          color = statusColorMap[status] ?? statusColorMap.unknown
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

function resetMap() {
  hasZoomed.value = false
  expandedStation.value = null
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

watch(
  () => props.activeTributaries,
  () => {
    if (
      expandedStation.value &&
      !props.activeTributaries.includes(expandedStation.value.tributary ?? '')
    ) {
      expandedStation.value = null
    }
    syncMarkers()
  },
  { deep: true },
)

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

    <div v-if="!hasZoomed" class="map-banner">
      Zoom in/out to see <strong>{{ selectedVariable }}</strong> values. Click on values for more
      information. Pins may take a while to load.
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
  max-width: 370px;
  pointer-events: none;
}
.reset-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 900;
  background: #1e40af;
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
  background: #1d4ed8;
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
  width: 360px;
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
:deep(.value-tooltip) {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  cursor: pointer;
}
:deep(.value-tooltip::before) {
  display: none !important;
}
:deep(.pin-value) {
  font-size: 1.235rem;
  font-weight: 700;
  white-space: nowrap;
}
</style>
