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
const markerMap = new Map<string, L.CircleMarker>()

const syncMarkers = () => {
  if (!map) return

  markerMap.forEach((m) => m.remove())
  markerMap.clear()

  console.log(`MAP_DEBUG: Syncing ${props.sites.length} stations...`)

  props.sites.forEach((station: Station) => {
    if (station.coordinates && station.coordinates.length === 2) {
      const [lat, lng] = station.coordinates

      const popupContainer = document.createElement('div')
      popupContainer.style.minWidth = '180px'

      createApp({
        render: () => h(StationCard, { site: station, mapMode: true }),
      }).mount(popupContainer)

      const newMarker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.9,
      })
        .addTo(map!)

        .bindPopup(popupContainer, {
          maxWidth: 300,
          autoClose: true,
          closeOnClick: true,
        })
        .on('click', () => {
          console.log('Pin clicked:', station.id)
          emit('select', station.id)
        })

      markerMap.set(station.id, newMarker)
    }
  })
}

onMounted(() => {
  console.log('MAP_DEBUG: Initializing Leaflet map...')

  map = L.map('map-div', {
    center: [41.737, -111.83],
    zoom: 12, // Default zoom look over Logan River
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
  () => {
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

:deep(.leaflet-control-container) {
  z-index: 1000;
}

:deep(.leaflet-popup-content-wrapper) {
  background: #ffffff !important;
  background-color: #ffffff !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
  padding: 0 !important;
}

:deep(.leaflet-popup-tip-container) {
  display: none !important;
}

:deep(.leaflet-popup-close-button) {
  color: #64748b !important;
  padding: 8px 8px 0 0 !important;
}
</style>
