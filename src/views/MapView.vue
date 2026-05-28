<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, watch, onBeforeUnmount, createApp, h } from 'vue'
import { type Station } from '../hydroService'
import StationCard from '../components/StationCard.vue'

const props = defineProps<{
  sites: Station[]
  selectedId: string | null
}>()

const emit = defineEmits(['select'])

let map: L.Map | null = null
const markerMap = new Map<string, L.Marker>()

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function isStationExpired(site: Station): boolean {
  if (!site || !site.observation) return true
  if (site.observation.result === -9999 || site.observation.result === null) return true
  if (!site.observation.phenomenonTime) return true

  const obsTime = new Date(site.observation.phenomenonTime).getTime()
  const cutoffTime = Date.now() - ONE_YEAR_MS

  return obsTime < cutoffTime
}

const syncMarkers = () => {
  if (!map) return

  // Clean up old markers
  markerMap.forEach((m) => m.remove())
  markerMap.clear()

  const allCoords: L.LatLngTuple[] = []

  props.sites.forEach((station: Station) => {
    if (isStationExpired(station)) return

    if (station.coordinates && station.coordinates.length === 2) {
      const coords = station.coordinates as L.LatLngTuple
      allCoords.push(coords)

      const popupContainer = document.createElement('div')

      const app = createApp({
        render: () => h(StationCard, { site: station, mapMode: true }),
      })
      app.mount(popupContainer)

      const pinSvg = `
        <svg viewBox="0 0 24 24" width="22" height="28">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ef4444" stroke="#b91c1c" stroke-width="1"/>
          <circle cx="12" cy="9" r="3" fill="white"/>
        </svg>`

      const redPin = L.divIcon({
        className: 'custom-pin',
        html: pinSvg,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      })

      const marker = L.marker(coords, { icon: redPin })
        .addTo(map!)
        .bindTooltip(popupContainer, {
          permanent: true,
          direction: 'top',
          offset: [0, -20],
          className: 'clean-tooltip',
          interactive: true,
        })
        .on('click', () => emit('select', station.uuid))

      marker.openPopup()
      markerMap.set(station.uuid, marker)
    }
  })

  if (allCoords.length > 0) {
    const bounds = L.latLngBounds(allCoords)
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

onMounted(() => {
  map = L.map('map-div', {
    center: [41.737, -111.83],
    zoom: 12,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

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
  () => syncMarkers(),
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
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 600px;
  position: relative;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}

#map-div {
  width: 100%;
  height: 100%;
  background: #f8f9fa;
}

:deep(.custom-pin) {
  background: transparent;
  border: none;
}

:deep(.leaflet-control-container) {
  z-index: 1000;
}

:deep(.leaflet-tooltip.clean-tooltip) {
  background: #b6b6b6c0 !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

:deep(.leaflet-tooltip.clean-tooltip::before) {
  display: none !important;
}

:deep(.leaflet-tooltip) {
  z-index: 600;
  transition:
    z-index 0.2s,
    transform 0.2s;
}

:deep(.leaflet-tooltip:hover) {
  z-index: 1000 !important;
  transform: scale(1.05);
}
</style>
